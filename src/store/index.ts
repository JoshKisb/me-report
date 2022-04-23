import React from "react";
import { observable, runInAction, makeAutoObservable, toJS } from "mobx";
import { flatten, uniqBy } from "lodash";

const thematicAreaId = "uiuTNKXPniu";

export class Store {
	engine: any;
	userOrgUnits: any = [];
	orgUnitGroups?: any = [];
	selectedLevel?: any;
	selectedOrgUnit?: any;
	selectedOrgUnitGroup?: any;
	projects: any;
	selectedProject?: any;
	thematicAreas?: any;
	selectedThematicArea?: any;
	selectedObjective?: any;
	selectedYear?: any;
	indicators?: any = [];

	constructor(engine) {
		makeAutoObservable(this);
		this.engine = engine;
		this.userOrgUnits = [];
		this.projects = [];
		this.thematicAreas = [];
		this.orgUnitGroups = [];
	}

	setSelectedLevel = (level) => {
		this.selectedLevel = level;
	};

	setSelectedOrgUnit = (orgUnit) => {
		this.selectedOrgUnit = orgUnit;
	};

	setSelectedOrgUnitGroup = (orgUnitGroup) => {
		this.selectedOrgUnitGroup = orgUnitGroup;
		const group = this.orgUnitGroups.find((g) => g.id == orgUnitGroup);
		const orgUnits = group?.organisationUnits?.map((o) => o.id) ?? [];
		//this.setSelectedOrgUnit(orgUnits);
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
		let group = this.userOrgUnits.find((org) => org.id === orgUnit);
		if (!group) {
			if (!!this.selectedLevel && !!this.selectedProjectOrgs)
				group = this.selectedProjectOrgs.find((o) => o.id == orgUnit);
			else {
				for (const g of this.orgUnitGroups) {
					group = g.organisationUnits.find((o) => o.id == orgUnit);
					if (!!group) break;
				}
			}
		}
		return group?.name;
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
						"id,name,indicators[name,id,code,description,indicatorType[id,name],legendSets[id,legends[endValue,color,displayName]]]",
					///api/29/indicators/fShDc5bXPDT.json?fields=legendSets[id,legends[endValue,color,displayName]]
				},
			},
		};
		try {
			const result = await this.engine.query(query);
			console.log("fetchIndictors:", result);

			const periods = years.flatMap((year) => [
				`${year}`,
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

			const indicators = indicatorMaps.flatMap((group) => group.indicators);
			this.indicators = indicators;

			const indicatorIds = indicatorGroups.flatMap((group) =>
				group.indicators.map((indicator) => indicator.id)
			);

			console.log("this.indicators", this.indicators);

			const dx = indicatorIds.join(";");

			let mappedIndicatorValues = [];

			if (indicatorIds.length == 0) return [];

			for (const orgUnit of orgUnits) {
				const orgUnitName = this.getOrgUnitName(orgUnit);
				const url = `/api/29/analytics?dimension=rJ9cwmnKoP1:MAKKtv2MQbt;UwHkqmSsQ7i,dx:${dx},pe:${periodStr}&filter=ou:${orgUnit}&displayProperty=NAME&skipMeta=true&includeNumDen=true`;
				const result = await this.engine.link.fetch(url);

				console.log("Result", result);

				const indexes = {};
				result.headers.forEach((h: any, i) => {
					indexes[h.name] = i;
				});

				indicatorMaps.forEach((indicatorGroup) => {
					const indicatorMap = indicatorGroup.indicators;

					const indicatorValues = Object.values(indicatorMap).flatMap(
						(indicator) => {
							return years.map((year) => {
								let qVals = [];
								let qTVals = [];
								let systemTarget = 0;
								let systemActual = 0;
								let totalActual = 0;
								let totalTarget = 0;

								const actualYrRow = result.rows.find(
									(row) =>
										row[indexes.dx] === indicator.actualId &&
										row[indexes.pe] === `${year}` &&
										row[indexes.rJ9cwmnKoP1] === "UwHkqmSsQ7i"
								);
								systemActual = actualYrRow?.[indexes.value];

								const targetYrRow = result.rows.find(
									(row) =>
										row[indexes.dx] === indicator.targetId &&
										row[indexes.pe] === `${year}` &&
										row[indexes.rJ9cwmnKoP1] === "MAKKtv2MQbt"
								);
								systemTarget = targetYrRow?.[indexes.value];

								let totalNA = 0;
								let totalDA = 0;
								let totalNT = 0;
								let totalDT = 0;

								for (let i = 0; i < 4; i++) {
									const pe = `${year}Q${i + 1}`;

									// Actual
									const actualRow = result.rows.find(
										(row) =>
											row[indexes.dx] === indicator.actualId &&
											row[indexes.pe] === pe &&
											row[indexes.rJ9cwmnKoP1] === "UwHkqmSsQ7i"
									);

									// Target
									const targetRow = result.rows.find(
										(row) =>
											row[indexes.dx] === indicator.actualId &&
											row[indexes.pe] === pe &&
											row[indexes.rJ9cwmnKoP1] === "MAKKtv2MQbt"
									);

									const actualValue = actualRow?.[indexes.value];
									qVals[i] = !!actualValue
										? parseFloat(actualValue)
										: null;

									const tagValue = targetRow?.[indexes.value];
									qTVals[i] = !!tagValue ? parseFloat(tagValue) : null;

									if (indicator.type == "ay1aN8SGK7J") {
										// Latest number
										if (!!actualValue) {
											totalActual = qVals[i];
										}
										if (!!tagValue) {
											totalTarget = qTVals[i];
										}
									} else if (indicator.type == "Vejcb1Wvjrc") {
										// Cumulative percentage"

										if (!!tagValue) {
											const n = parseFloat(
												targetRow?.[indexes.numerator] || 0
											);
											const d = parseFloat(
												targetRow?.[indexes.denominator] || 0
											);
											totalDT += d;
											totalTarget = qTVals[i];
										}

										if (!!actualValue) {
											const n = parseFloat(
												actualRow?.[indexes.numerator] || 0
											);
											const d = parseFloat(
												actualRow?.[indexes.denominator] || 0
											);
											totalDA += d;
											totalActual += n;
										}
										// totalActual = totalActual / totalTarget
									} else {
										totalActual += qVals[i] || 0;
										totalTarget += qTVals[i] || 0;
									}
								}

								if (indicator.type == "Vejcb1Wvjrc") {
									totalActual = (totalActual / totalDA) * 100;
									// totalTarget = totalTarget / totalDT;
								}

								// set total to null instead of 0
								if (qTVals.every((x) => x == null)) totalTarget = null;
								if (qVals.every((x) => x == null)) totalActual = null;

								let percentage = null;

								if (indicator.type == "Vejcb1Wvjrc") {
									percentage = totalActual;
								} else if (
									totalActual !== null &&
									totalTarget !== null
								) {
									percentage =
										totalActual === totalTarget
											? 100
											: (totalActual * 100) / (totalTarget || 1);
								}

								const color = indicator.colors?.find((c, index) => {
									return (
										percentage < parseFloat(c.endValue) ||
										index == indicator.colors.length - 1
									);
								});

								const toOneDecimal = (value) =>
									!!value && value % 1 !== 0
										? Number(value).toFixed(1)
										: value;

								// remove rows with 0 for total actual and target
								if (!totalActual && !totalTarget) return;

								return {
									id: indicator.id,
									name: indicator.name,
									quartelyValues: qVals,
									orgUnit,
									orgUnitName,
									year,
									target: toOneDecimal(totalTarget),
									target2: systemTarget,
									actual: toOneDecimal(totalActual),
									actual2: systemActual,
									percentage: toOneDecimal(percentage),
									color: color?.color,
								};
							});
						}
					);

					mappedIndicatorValues.push({
						objectiveId: indicatorGroup.id,
						objective: indicatorGroup.name,
						thematicArea: indicatorGroup.thematicArea,
						values: indicatorValues.filter((v) => !!v),
						key: `${orgUnit};${indicatorGroup.id}`,
					});
				});
			}

			console.log("mappedIndicatorValues", mappedIndicatorValues);
			if (this.selectedThematicAreaArray.length > 0) {
				let mapo = {};
				mappedIndicatorValues.forEach((iv) => {
					if (iv.values.length == 0) return;
					if (!mapo[iv.thematicArea]) {
						mapo[iv.thematicArea] = iv;
					} else {
						mapo[iv.thematicArea].values = [
							...mapo[iv.thematicArea].values,
							...iv.values,
						];
					}
				});
				mappedIndicatorValues = Object.values(mapo);
			}
			return mappedIndicatorValues;
		} catch (e) {
			console.log("error", e);
		}
	};

	// // combine targets and actuals then return indicators
	// _getIndicatorsFromGroups = (indicatorGroups: any) => {

	// }

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

		const tagRe = /\s*TAG_(\w+)/i; //\s*-\s*(.*)/i;
		const actRe = /\s*ACT_(\w+)/i; //\s*-\s*(.*)/i;

		indicatorGroups.forEach((group) => {
			let indicatorMap = {};

			const addIndicatorToMap = (key, name, colors, thematicArea, type) => {
				if (!indicatorMap.hasOwnProperty(key)) {
					indicatorMap[key] = {
						id: key,
						name: name,
						colors: colors,
						thematicArea,
						type,
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
				const tagMatch = indicator.code.match(tagRe);
				const actMatch = indicator.code.match(actRe);

				if (!!tagMatch) {
					// skip TAGs now
					// addIndicatorToMap(
					// 	tagMatch[1],
					// 	indicator.description,
					// 	colors,
					// 	thematicArea,
					// 	indicator.indicatorType.id
					// );
					// indicatorMap[tagMatch[1]].targetId = indicator.id;
				} else if (!!actMatch) {
					addIndicatorToMap(
						actMatch[1],
						indicator.description,
						colors,
						thematicArea,
						indicator.indicatorType.id
					);
					indicatorMap[actMatch[1]].actualId = indicator.id;
				} else {
					addIndicatorToMap(
						indicator.code,
						indicator.description,
						colors,
						thematicArea,
						indicator.indicatorType.id
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
						name: group.name,
						thematicArea: area.name,
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
			orgUnitGroups: {
				resource: "organisationUnitGroups.json",
				params: {
					fields:
						"id,name,organisationUnits[id,name,ancestors[id,name,level],parent[id]]",
					paging: false,
				},
			},
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
			const orgs = data.organisationUnits.organisationUnits;
			const orgUnitGroups = data.orgUnitGroups.organisationUnitGroups;

			this.userOrgUnits = orgs;
			this.orgUnitGroups = orgUnitGroups;
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
				return unit.children
					.sort((a, b) =>
						a.name.toLowerCase().localeCompare(b.name.toLowerCase())
					)
					.map((child: any) => {
						return { ...child, pId: parent };
					});
			});
			const all = flatten(found);
			const orgs = [...this.userOrgUnits, ...all];
			this.userOrgUnits = uniqBy(orgs, "id");
		} catch (e) {
			console.log(e);
		}
	};

	loadSearchOrganisationUnits = async (search: string) => {
		const query = {
			organisations: {
				resource: `organisationUnits.json`,
				params: {
					filter: `name:ilike:${search}`,
					paging: "false",
					fields: "id,name,ancestors[id,name,parent[id]],parent[id]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			const found = data.organisations.organisationUnits.flatMap(
				(unit: any) => {
					const ancestors = unit.ancestors.map((a) => {
						return { ...a, pId: a.parent?.id };
					});
					return [
						{ id: unit.id, name: unit.name, pId: unit.parent?.id },
						...ancestors,
					];
				}
			);
			// const all = flatten(found);
			console.log("found", found);
			const orgs = [...this.userOrgUnits, ...found];
			this.userOrgUnits = uniqBy(orgs, "id").sort((a, b) =>
				a.name.toLowerCase().localeCompare(b.name.toLowerCase())
			);
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
					fields: "indicatorGroups[id,name,indicators[name,id,code]]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			// console.log("projects:", data);

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
	get selectedProjectArray() {
		return Array.isArray(this.selectedProject)
			? this.selectedProject
			: [this.selectedProject];
	}
	get selectedObjectiveArray() {
		return Array.isArray(this.selectedObjective)
			? this.selectedObjective
			: [this.selectedObjective];
	}

	get selectedProjectOrgs() {
		let levelOrgs;
		if (!!this.selectedLevel && !!this.selectedProjectArray.length) {
			const selectedProjects = this.projects.filter((p) =>
				this.selectedProjectArray.includes(p.id)
			);
			const orgUnitGroups = this.orgUnitGroups.filter((g) =>
				selectedProjects.some((p) => p.name === g.name)
			);
			levelOrgs = orgUnitGroups.flatMap((g) => {
				if (this.selectedLevel == 5) return g.organisationUnits;

				return g.organisationUnits.map((org) =>
					org.ancestors.find((a) => a.level == this.selectedLevel)
				);
			});

			console.log("selectedProjects", selectedProjects);
			console.log("orgUnitGroups", orgUnitGroups);
			console.log("levelOrgs", levelOrgs);
		}
		return levelOrgs;
	}
	get selectedOrgUnitArray() {
		let orgUnitGroupOrgs;
		let levelOrgs;
		let orgUnits;

		if (!!this.selectedOrgUnitGroup) {
			const group = this.orgUnitGroups.find(
				(g) => g.id == this.selectedOrgUnitGroup
			);
			orgUnitGroupOrgs = group?.organisationUnits;
			orgUnits = orgUnitGroupOrgs?.map((o) => o.id);
		}

		if (!!this.selectedOrgUnit) {
			orgUnits = Array.isArray(this.selectedOrgUnit)
				? this.selectedOrgUnit
				: [this.selectedOrgUnit];
		}

		if (!!this.selectedLevel && !!this.selectedProjectOrgs) {
			orgUnits = this.selectedProjectOrgs.map((o) => o.id);
		}

		console.log("orgUnitGroupOrgs", orgUnitGroupOrgs);
		console.log("orgUnits", orgUnits);

		return orgUnits ?? [];
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
			(!!this.selectedOrgUnitArray?.length || !!this.selectedLevel)
		);
	}

	get hasThematicAreas() {
		const hasManyOrgs = this.selectedOrgUnitArray.length > 1;
		const hasManyYrs = this.selectedYearArray.length > 1;
		const hasManyObjectives = this.selectedObjectiveArray.length > 1;
		const hasSelectedThematicArea = this.selectedThematicAreaArray.length > 0;
		return (
			//hasManyOrgs ||
			//hasManyYrs ||
			//hasManyObjectives ||
			hasSelectedThematicArea
		);
	}
}

export const StoreContext = React.createContext();

/* Hook to use store in any functional component */
export const useStore = () => React.useContext(StoreContext);
