import React from "react";
import { observable, runInAction, makeAutoObservable } from "mobx";
import { flatten } from "lodash";

export class Store {
	engine: any;
	userOrgUnits: any = [];
	selectedOrgUnit?: any;
	projects: any;
	selectedProject?: any;
	selectedObjective?: any;
	selectedYear?: any;

	constructor(engine) {
		makeAutoObservable(this);
		this.engine = engine;
		this.userOrgUnits = [];
	}

	setSelectedOrgUnit = (orgUnit) => {
		this.selectedOrgUnit = orgUnit;
	};

	setSelectedProject = (project) => {
		console.log("selectedProject", project);
		this.selectedProject = project;
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
		const orgUnits = Array.isArray(this.selectedOrgUnit)
			? this.selectedOrgUnit
			: [this.selectedOrgUnit]; //"K74ysFimUwH";

		const years = Array.isArray(this.selectedYear)
			? this.selectedYear
			: [this.selectedYear];

		const objectives = Array.isArray(this.selectedObjective)
			? this.selectedObjective
			: [this.selectedObjective];

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
			const data = await this.engine.query(query);
			console.log("fetchIndictors:", data);

			const indicatorGroups = data.indicatorGroups.indicatorGroups; //["CTb5bVzcEbU","K4AeeWVALpq","FhiaL2mUSoo","QMyTzu8zKUp","W03LOqxoYd6","cMDzD9MxFta","dQ38pFxrHaU","SioU4rBJlDl","JtUHitSV43e","HmfGt0OHzJY","DA2OMVvhXlv","YvXv1qhtydm","h6RmQHnPDE2","uA1F8OuqHXI","fShDc5bXPDT","erUuUkZhr2u","xBnGG9EtkiG","AxIbqJ4M21O","V8BpxQC0R95","zb4k92ACPtP","MaCntsRBjDw","uuYcirBttqw","Bzzrry9YBae","u4b2kENWhgF","vRicBw9t6tv","brYAEP8d5Wn","k8sauqPHBx6","fEfZukNLFCQ","em17q1a9k6g","RF5L35w5cww","aQGdG62wWnk","hld8H9ABApV","GPMOfMohNNo","lZtOI3yam7i","P4Hz9Tt85F9","Cfvf452pvGa","SNAt1d5fGyk","ZNV8lk5TWga","U3RAq2bGnHh","Fk1Hn9o3Vd8","gplI9TZnsgL","wNUqmGUAah1","pU5XBvlUgK7","A5KPhtC2yVB","pkKDS4uagV5","pksEEQs7HFc","u5874InX3tj","Dqp11dt7zse","yvstFQZcSzp","KGF5Rl4TBcL","RI0EfIc0CnP","C5tZ4KKxgJx","nJJ2jXIMaEt","hfTnzlAmEB2","trtmeL0A4KJ","eHGkry8ecTK","lQ6FnyeDp2l","AVisO3i0enp","M4VcHzMb3s2","KEqIYWuZ8Y8","zTLpUjaJmvR","vYA0PJdeUji"];

			const periods = years.flatMap((year) => [
				`${year}Q1`,
				`${year}Q2`,
				`${year}Q3`,
				`${year}Q4`,
			]);

			const periodStr = periods.join(";"); //"2021";

			const indicatorMaps = this._createIndicatorMaps(indicatorGroups);
			console.log("indicatorMaps", indicatorMaps);

			const indicatorIds = indicatorGroups.flatMap((group) =>
				group.indicators.map((indicator) => indicator.id)
			);
			const dx = indicatorIds.join(";");

			let mappedIndicatorValues = [];

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
			name: indicatorGroupName (objective)
			indicators: {name, colors}[] 
		}
	]
	*/
	_createIndicatorMaps = (indicatorGroups: any) => {
		let indicatorMaps = [];

		const tagRe = /\s*TAG_(\w+)\s*-\s*(.*)/i;
		const actRe = /\s*ACT_(\w+)\s*-\s*(.*)/i;

		indicatorGroups.forEach((group) => {
			let indicatorMap = {};

			const addIndicatorToMap = (key, name, colors) => {
				if (!indicatorMap.hasOwnProperty(key)) {
					indicatorMap[key] = {
						name: name,
						colors: colors,
					};
				}
			};
			group.indicators.forEach((indicator) => {
				const colorsUnsorted = indicator.legendSets?.[0]?.legends ?? [];
				const colors = colorsUnsorted?.sort(
					(a, b) => parseFloat(a.endValue) - parseFloat(b.endValue)
				);
				const tagMatch = indicator.name.match(tagRe);
				const actMatch = indicator.name.match(actRe);

				if (!!tagMatch) {
					addIndicatorToMap(tagMatch[1], indicator.description, colors);
					indicatorMap[tagMatch[1]].targetId = indicator.id;
				} else if (!!actMatch) {
					addIndicatorToMap(actMatch[1], indicator.description, colors);
					indicatorMap[actMatch[1]].actualId = indicator.id;
				} else {
					addIndicatorToMap(indicator.code, indicator.description, colors);
					indicatorMap[indicator.code].actualId = indicator.id;
				}
			});

			indicatorMaps.push({
				id: group.id,
				name: group.name,
				indicators: indicatorMap,
			});
		});

		return indicatorMaps;
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
					paging: false,
					fields: "id,displayName,indicatorGroups[name,id]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			console.log("projects:", data);
			this.projects = data.projects.indicatorGroupSets.map((p) => {
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
		return hasManyOrgs || hasManyYrs || hasManyObjectives;
	}
}

export const StoreContext = React.createContext();

/* Hook to use store in any functional component */
export const useStore = () => React.useContext(StoreContext);
