import React from "react";
import { observable, runInAction, makeAutoObservable, toJS } from "mobx";
import { flatten } from "lodash";

const thematicAreaId = "uiuTNKXPniu";

export class Store {
	engine: any;
	userOrgUnits: any = [];
	selectedOrgUnit?: any;
	projects: any;
	selectedProject?: any;
	thematicAreas?: any;
	selectedThematicArea?: any;
	selectedObjective?: any;
	selectedYear?: any;

	constructor(engine) {
		makeAutoObservable(this);
		this.engine = engine;
		this.userOrgUnits = [];
		this.projects = [];
		this.thematicAreas = [];
	}

	setSelectedOrgUnit = (orgUnit) => {
		this.selectedOrgUnit = orgUnit;
	};

	setSelectedProject = (project) => {
		console.log("selectedProject", project);
		this.selectedProject = project;
	};

	setSelectedThematicArea = (area) => {
		this.selectedThematicArea = area;
	};

	setSelectedObjective = (objective) => {
		this.selectedObjective = objective;
	};

	setSelectedYear = (year) => {
		this.selectedYear = year;
	};

	getOrgUnitName = (orgUnit) => {
		return this.userOrgUnits.find((org) => org.id === orgUnit)?.name;
	};

	fetchIndicators = async () => {
		const orgUnits = this.selectedOrgUnitArray;
		const years = this.selectedYearArray;
		const objectives = this.selectedObjectiveArray;

		const query = {
			indicatorGroups: {
				resource: `indicatorGroups.json`,
				params: {
					filter: `id:in:[${objectives.join(",")}]`,
					paging: false,
					fields:
						"id,name,indicators[name,id,code,description,legendSets[id,legends[endValue,color,displayName]]]",
					///api/29/indicators/fShDc5bXPDT.json?fields=legendSets[id,legends[endValue,color,displayName]]
				},
			},
		};
		try {
			const result = await this.engine.query(query);
			console.log("fetchIndictors:", result);

			const periods = years.flatMap((year) => [
				`${year}Q1`,
				`${year}Q2`,
				`${year}Q3`,
				`${year}Q4`,
			]);

			const periodStr = periods.join(";");

			// Filter by selected thematic area
			const indicatorGroupsRes = result.indicatorGroups.indicatorGroups;
			const indicatorGroups = indicatorGroupsRes.map((group) => {
				if (this.selectedThematicAreaArray.length > 0) {
					const possibleIndicators = this.thematicAreas
						.filter((area) =>
							this.selectedThematicAreaArray.includes(area.id)
						)
						.flatMap((area) => area.indicators);

					const filteredIndicators = group.indicators.filter((indicator) =>
						possibleIndicators.some((pi) => pi.id == indicator.id)
					);

					return { ...group, indicators: filteredIndicators };
				}
				return group;
			});

			console.log("filtered indicatorGroups", indicatorGroups);
			const indicatorMaps = this._createIndicatorMaps(indicatorGroups);

			console.log("indicatorMaps", indicatorMaps);

			const indicatorIds = indicatorGroups.flatMap((group) =>
				group.indicators.map((indicator) => indicator.id)
			);
			const dx = indicatorIds.join(";");

			let mappedIndicatorValues = [];

			if (indicatorIds.length == 0) return [];

			for (const orgUnit of orgUnits) {
				const orgUnitName = this.getOrgUnitName(orgUnit);
				const url = `/api/36/analytics?dimension=dx:${dx},pe:${periodStr}&filter=ou:${orgUnit}&displayProperty=NAME&includeNumDen=true&skipMeta=true&skipData=false`;
				const result = await this.engine.link.fetch(url);

				console.log("Result", result);

				const dxIndex = result.headers.findIndex(
					(h: any) => h.name === "dx"
				);
				const peIndex = result.headers.findIndex(
					(h: any) => h.name === "pe"
				);
				const valIndex = result.headers.findIndex(
					(h: any) => h.name === "value"
				);

				years.forEach((year) => {
					indicatorMaps.forEach((indicatorGroup) => {
						const indicatorMap = indicatorGroup.indicators;

						const indicatorValues = Object.values(indicatorMap).map(
							(indicator) => {
								let qVals = [];
								let totalActual = 0;
								let totalTarget = 0;

								for (let i = 0; i < 4; i++) {
									const pe = `${year}Q${i + 1}`;
									const actualRow = result.rows.find(
										(row) =>
											row[dxIndex] === indicator.actualId &&
											row[peIndex] === pe
									);
									qVals[i] = parseFloat(actualRow?.[valIndex] || 0);

									totalActual += qVals[i];
									const targetRow = result.rows.find(
										(row) =>
											row[dxIndex] === indicator.targetId &&
											row[peIndex] === pe
									);
									totalTarget += parseFloat(
										targetRow?.[valIndex] || 0
									);
								}

								const percentage =
									totalActual === totalTarget
										? 100
										: (totalActual * 100) / (totalTarget || 1);

								const color = indicator.colors?.find((c, index) => {
									return (
										percentage < parseFloat(c.endValue) ||
										index == indicator.colors.length - 1
									);
								});

								return {
									id: indicator.actualId || indicator.targetId,
									name: indicator.name,
									quartelyValues: qVals,
									target: totalTarget,
									actual: totalActual,
									percentage: percentage,
									color: color?.color,
								};
							}
						);

						mappedIndicatorValues.push({
							orgUnit,
							orgUnitName,
							objectiveId: indicatorGroup.id,
							objective: indicatorGroup.name,
							year,
							values: indicatorValues,
							key: `${orgUnit};${year};${indicatorGroup.id}`,
						});
					});
				});
			}

			console.log("mappedIndicatorValues", mappedIndicatorValues);

			return mappedIndicatorValues;
		} catch (e) {
			console.log("error", e);
		}
	};

	/*
		@returns
		[
			{
				id: indicatorGroupId,
				name: indicatorGroupName (thematic area) ///objective)
				indicators: {name, colors, thematicArea}[] 
			}
		]
	*/
	_createIndicatorMaps = (indicatorGroups: any) => {
		let indicatorMaps = [];

		const tagRe = /\s*TAG_(\w+)\s*-\s*(.*)/i;
		const actRe = /\s*ACT_(\w+)\s*-\s*(.*)/i;

		indicatorGroups.forEach((group) => {
			let indicatorMap = {};

			const addIndicatorToMap = (key, name, colors, thematicArea) => {
				if (!indicatorMap.hasOwnProperty(key)) {
					indicatorMap[key] = {
						name: name,
						colors: colors,
						thematicArea,
					};
				}
			};
			console.log("_createIndicatorMaps group", group);

			group.indicators.forEach((indicator) => {
				const thematicArea = this.thematicAreas.find((area) =>
					area.indicators.some((i) => i.id == indicator.id)
				);
				const colorsUnsorted = indicator.legendSets?.[0]?.legends ?? [];
				const colors = colorsUnsorted?.sort(
					(a, b) => parseFloat(a.endValue) - parseFloat(b.endValue)
				);
				const tagMatch = indicator.name.match(tagRe);
				const actMatch = indicator.name.match(actRe);

				if (!!tagMatch) {
					addIndicatorToMap(
						tagMatch[1],
						indicator.description,
						colors,
						thematicArea
					);
					indicatorMap[tagMatch[1]].targetId = indicator.id;
				} else if (!!actMatch) {
					addIndicatorToMap(
						actMatch[1],
						indicator.description,
						colors,
						thematicArea
					);
					indicatorMap[actMatch[1]].actualId = indicator.id;
				} else {
					addIndicatorToMap(
						indicator.code,
						indicator.description,
						colors,
						thematicArea
					);
					indicatorMap[indicator.code].actualId = indicator.id;
				}
			});

			indicatorMaps.push({
				id: group.id,
				name: group.name,
				indicators: Object.values(indicatorMap),
			});
		});

		
		if (this.selectedThematicAreaArray.length > 0)
			return this._groupIndicatorsByThematicAreas(indicatorMaps);
		else return indicatorMaps;
	};

	_groupIndicatorsByThematicAreas = (indicatorGroups) => {
		let indicatorMap = {};
		indicatorGroups.forEach((group) => {
			console.log("_groupIndicatorsByThematicAreas group", group);
			group.indicators.forEach((indicator) => {
				const area = indicator.thematicArea;
				if (!indicatorMap[area.id]) {
					indicatorMap[area.id] = {
						id: area.id,
						name: area.name,
						indicators: [],
					};
				}
				indicatorMap[area.id].indicators.push(indicator);
			});
		});
		return Object.values(indicatorMap);
	};

	loadOrgUnitRoots = async () => {
		const query = {
			organisationUnits: {
				resource: "organisationUnits.json",
				params: {
					level: 1,
					paging: false,
					fields: "id,path,name,displayName,leaf",
					// fields: "id,path,displayName,children::isNotEmpty",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			console.log("loadUserOrgUnits:", data);
			this.userOrgUnits = data.organisationUnits.organisationUnits;
		} catch (e) {
			console.log("error", e);
		}
	};

	loadOrganisationUnitsChildren = async (parent: string) => {
		const query = {
			organisations: {
				resource: `organisationUnits.json`,
				params: {
					filter: `id:in:[${parent}]`,
					paging: "false",
					fields: "children[id,name,path,leaf]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			const found = data.organisations.organisationUnits.map((unit: any) => {
				return unit.children.map((child: any) => {
					return { ...child, pId: parent };
				});
			});
			const all = flatten(found);
			this.userOrgUnits = [...this.userOrgUnits, ...all];
		} catch (e) {
			console.log(e);
		}
	};

	loadProjects = async () => {
		const query = {
			projects: {
				resource: "indicatorGroupSets.json",
				params: {
					filter: `id:!eq:${thematicAreaId}`,
					paging: false,
					fields: "id,displayName,indicatorGroups[name,id]",
				},
			},
			thematicAreas: {
				resource: `indicatorGroupSets/${thematicAreaId}.json`,
				params: {
					paging: false,
					fields: "indicatorGroups[id,name,indicators[name,id]]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			console.log("projects:", data);

			this.thematicAreas = data.thematicAreas.indicatorGroups.map((area) => {
				return {
					...area,
					name: area.name.replace(/^\s?Thematic Area\s?-?\s?/i, ""),
				};
			});

			const indicatorGroupSets = data.projects.indicatorGroupSets;
			this.projects = indicatorGroupSets.map((p) => {
				return {
					id: p.id,
					name: p.displayName,
					objectives: p.indicatorGroups,
				};
			});
		} catch (e) {
			console.log("error", e);
		}
	};

	get organisationUnits() {
		const units = this.userOrgUnits.map((unit: any) => {
			return {
				id: unit.id,
				pId: unit.pId || "",
				value: unit.id,
				title: unit.name,
				isLeaf: unit.leaf,
			};
		});
		return units;
	}

	get selectedThematicAreaArray() {
		return Array.isArray(this.selectedThematicArea)
			? this.selectedThematicArea
			: !!this.selectedThematicArea
			? [this.selectedThematicArea]
			: [];
	}
	get selectedObjectiveArray() {
		return Array.isArray(this.selectedObjective)
			? this.selectedObjective
			: [this.selectedObjective];
	}
	get selectedOrgUnitArray() {
		return Array.isArray(this.selectedOrgUnit)
			? this.selectedOrgUnit
			: [this.selectedOrgUnit];
	}
	get selectedYearArray() {
		return Array.isArray(this.selectedYear)
			? this.selectedYear
			: [this.selectedYear];
	}

	get fieldsSelected() {
		return (
			!!this.selectedObjective?.length &&
			!!this.selectedYear?.length &&
			!!this.selectedOrgUnit?.length
		);
	}

	get hasThematicAreas() {
		const hasManyOrgs = this.selectedOrgUnit?.length > 1;
		const hasManyYrs = this.selectedYear?.length > 1;
		const hasManyObjectives = this.selectedObjective?.length > 1;
		const hasSelectedThematicArea = this.selectedThematicAreaArray.length > 0;
		return (
			hasManyOrgs ||
			hasManyYrs ||
			hasManyObjectives ||
			hasSelectedThematicArea
		);
	}
}

export const StoreContext = React.createContext();

/* Hook to use store in any functional component */
export const useStore = () => React.useContext(StoreContext);
