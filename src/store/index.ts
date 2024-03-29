import React from "react";
import { makeAutoObservable } from "mobx";
import { flatten, uniqBy, uniq } from "lodash";
import { quarterPeriods } from "../utils/valueCalcuations";

const thematicAreaId = "uiuTNKXPniu";

const reverseRange = (from, to) =>
	[...Array(from - to)].map((_, i) => from - i);

	const periodConsts: string[] = [
		"LAST_5_FINANCIAL_YEARS",
		"THIS_FINANCIAL_YEAR",
		"LAST_FINANCIAL_YEAR",
	];

	const getCurrentFinancialYear = () => {
		const today = new Date();
		if (today.getMonth() + 1 < 10) {
			return today.getFullYear() - 1;
		} else {
			return today.getFullYear();
		}
	}


export class Store {
	engine: any;
	userOrgUnits: any = [];
	userInfo: any;
	orgUnitGroups?: any = [];
	selectedLevel?: any;
	selectedOrgUnit?: any;
	selectedOrgUnitGroup?: any;
	projects: any;
	selectedProject?: any;
	thematicAreas?: any;
	selectedThematicArea?: any;
	financialyearProjects: any;
	selectedObjective?: any;
	selectedYear?: any = ["THIS_FINANCIAL_YEAR"];//[new Date().getFullYear()];
	indicators?: any = [];
	showOrgUnit: boolean = false;

	constructor(engine) {
		makeAutoObservable(this);
		this.engine = engine;
		this.userOrgUnits = [];
		this.projects = [];
		this.thematicAreas = [];
		this.orgUnitGroups = [];
	}

	setShowOrgUnit = (val) => {
		this.showOrgUnit = val;
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

	getOrgUnit = (orgUnit) => {
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
		return group;
	};

	getOrgUnitName = (orgUnit) => {
		return this.getOrgUnit(orgUnit)?.name;
	};

	
	

	fetchIndicators = async () => {
		const orgUnits = this.selectedOrgUnitArray;
		const years = this.selectedYearArray;
		const objectives = this.selectedObjectiveArray;
		const currFYear = getCurrentFinancialYear();

		console.log("objectives", objectives);
		console.log("fetch orgs", orgUnits);

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

			
			const periods = years.flatMap((year) => {
				if (periodConsts.includes(year)) {					
					if (year === "THIS_FINANCIAL_YEAR")
						return [`${currFYear}Oct`].concat(quarterPeriods(currFYear));
					else if (year === "LAST_FINANCIAL_YEAR")
						return [`${currFYear - 1}Oct`].concat(quarterPeriods(currFYear - 1));
					else if (year === "LAST_5_FINANCIAL_YEARS") {
						return reverseRange(
							currFYear,
							currFYear - 5
						).flatMap(y => [`${y}Oct`].concat(quarterPeriods(y)));
					}
				} else {
					return quarterPeriods(year, false)
				}
		});

			const periodStr = periods.join(";");

			// Filter by selected thematic area
			const indicatorGroupsRes = result.indicatorGroups.indicatorGroups;
			const idg = uniqBy(indicatorGroupsRes, "id")
			const indicatorGroups = idg.map((group) => {
				if (this.selectedThematicAreaArray.length > 0) {
					const possibleIndicators = this.thematicAreas
						.filter((area) =>
							this.selectedThematicAreaArray.includes(area.id)
						)
						.flatMap((area) => area.indicators);

					const possibleIndicatorsUniq = uniqBy(possibleIndicators, "id")
					const filteredIndicators = group.indicators.filter(
						(indicator) =>
							possibleIndicatorsUniq.some(
								(pi) => pi.id == indicator.id
							)
					);

					return { ...group, indicators: filteredIndicators };
				}
				return group;
			});

			console.log("filtered indicatorGroups", indicatorGroups);
			const indicatorMaps = this._createIndicatorMaps(indicatorGroups);

			console.log("indicatorMaps", indicatorMaps);

			const indicators = indicatorMaps.flatMap(
				(group) => group.indicators
			);
			this.indicators = indicators;

			const indicatorIds = indicatorGroups.flatMap((group) =>
				group.indicators.map((indicator) => indicator.id)
			);

			console.log("this.indicators", this.indicators);

			let ouGroup = "";
			if (!this.selectedOrgUnitGroup) {
				ouGroup = ";" + this.selectedProjectArray.map(projectId => {
					const project = this.projects.find(p => p.id === projectId);
					const ouGroup = this.orgUnitGroups.find(oug => oug.name === project.name)
					return `OU_GROUP-${ouGroup.id}`;
				}).join(";")
			}

			const dx = indicatorIds.join(";");

			let mappedIndicatorValues = [];

			if (indicatorIds.length == 0) return [];

			for (const orgUnit of orgUnits) {
				const orgUnitObj = this.getOrgUnit(orgUnit);
				const url = `/api/29/analytics?dimension=rJ9cwmnKoP1:MAKKtv2MQbt;UwHkqmSsQ7i,dx:${dx},pe:${periodStr}&filter=ou:${orgUnit}${ouGroup}&displayProperty=NAME&skipMeta=true&includeNumDen=true`;
				const result = await this.engine.link.fetch(url);

				console.log("Result", result);

				const indexes: any = {};
				result.headers.forEach((h: any, i) => {
					indexes[h.name] = i;
				});

				type TotalNum = number | null | undefined;

				const yearsArr = uniq(years.flatMap((y) => {
					if (y === "THIS_FINANCIAL_YEAR")
						return {year: currFYear, financial: true };
					else if (y === "LAST_FINANCIAL_YEAR")
						return {year: currFYear - 1, financial: true};
					else if (y === "LAST_5_FINANCIAL_YEARS")
						return reverseRange(
							new Date().getFullYear(),
							new Date().getFullYear() - 5
						).map(y => ({year: y, financial: true}));
					else return {year: y, financial: false};					
				}))

				
				console.log("yearArr", yearsArr)
				indicatorMaps.forEach((indicatorGroup) => {
					const indicatorMap = indicatorGroup.indicators;

					const indicatorValues = Object.values(indicatorMap).flatMap(
						(indicator: any) => {
							return yearsArr.map((yearObj) => {
								let qVals = [];
								let qTVals = [];
								let systemTarget: TotalNum = 0;
								let systemActual = 0;
								let totalActual: TotalNum = 0;
								let totalTarget: TotalNum = 0;
								const year = yearObj.year;
								const hasOctPE = yearObj.financial;

								const actualYrRow = result.rows.find(
									(row) =>
										row[indexes.dx] ===
											indicator.actualId &&
										row[indexes.pe] === `${year}` &&
										row[indexes.rJ9cwmnKoP1] ===
											"UwHkqmSsQ7i"
								);
								systemActual = actualYrRow?.[indexes.value];

								const targetYrRow = result.rows.find(
									(row) =>
										row[indexes.dx] ===
											indicator.actualId &&
										row[indexes.pe] === `${year}` &&
										row[indexes.rJ9cwmnKoP1] ===
											"MAKKtv2MQbt"
								);

								const targetFYrRow = result.rows.find(
									(row) =>
										row[indexes.dx] ===
											indicator.actualId &&
										row[indexes.pe] === `${year}Oct` &&
										row[indexes.rJ9cwmnKoP1] ===
											"MAKKtv2MQbt"
								);

								// console.log("xxx", year, targetFYrRow)

								systemTarget = targetYrRow?.[indexes.value] ?? targetFYrRow?.[indexes.value];
								systemTarget = !!systemTarget ? parseFloat(systemTarget.toString()): null;
								// let hasOctPE = false;
								// if (!!targetFYrRow) {
								// 	hasOctPE = true
								// 	// console.log("zz", systemTarget)
								// }

								let totalNA = 0;
								let totalDA = 0;
								let totalNT = 0;
								let totalDT = 0;

								// console.log("--------------")
								// console.log("periods", quarterPeriods(year, hasOctPE).slice(1))
								quarterPeriods(year, hasOctPE).slice(1).forEach((pe, i) => {
									// const pe = `${year}Q${i + 1}`;
									// console.log("pe", pe, i);

									// Actual
									const actualRow = result.rows.find(
										(row) =>
											row[indexes.dx] ===
												indicator.actualId &&
											row[indexes.pe] === pe &&
											row[indexes.rJ9cwmnKoP1] ===
												"UwHkqmSsQ7i"
									);

									// Target
									const targetRow = result.rows.find(
										(row) =>
											row[indexes.dx] ===
												indicator.actualId &&
											row[indexes.pe] === pe &&
											row[indexes.rJ9cwmnKoP1] ===
												"MAKKtv2MQbt"
									);

									const actualValue =
										actualRow?.[indexes.value];
									qVals[i] = !!actualValue
										? parseFloat(actualValue)
										: null;

									const tagValue = targetRow?.[indexes.value];
									qTVals[i] = !!tagValue
										? parseFloat(tagValue)
										: null;

									if (indicator.type == "ay1aN8SGK7J") {
										// Latest number
										if (!!actualValue) {
											totalActual = qVals[i];
										}
										if (!!tagValue) {
											totalTarget = qTVals[i];
										}
									} else if (
										indicator.type == "Vejcb1Wvjrc"
									) {
										// Cumulative percentage"

										if (!!tagValue) {
											const n = parseFloat(
												targetRow?.[
													indexes.numerator
												] || 0
											);
											const d = parseFloat(
												targetRow?.[
													indexes.denominator
												] || 0
											);
											totalDT += d;
											totalNT += n;
											totalTarget = qTVals[i];
										}

										if (!!actualValue) {
											const n = parseFloat(
												actualRow?.[
													indexes.numerator
												] || 0
											);
											const d = parseFloat(
												actualRow?.[
													indexes.denominator
												] || 0
											);
											totalDA += d;
											totalNA += n;
											totalActual = (totalActual ?? 0) + n;
										}
										// totalActual = totalActual / totalTarget
									} else {
										totalActual = (totalActual ?? 0) + (qVals[i] || 0);
										totalTarget = (totalActual ?? 0) + (qTVals[i] || 0);
									}
								})

								if (indicator.type == "Vejcb1Wvjrc") {
									// cumulative percentage
									totalActual = ((totalNA ?? 0) / totalDA);
									// totalTarget = totalTarget / totalDT;
								}

								if (hasOctPE) {
									totalTarget = systemTarget
								}

								// set total to null instead of 0
								if (qTVals.every((x) => x == null && !hasOctPE))
									totalTarget = null;
								if (qVals.every((x) => x == null))
									totalActual = null;

								let percentage: number | null = null;

								if (
									totalActual !== null &&
									totalTarget !== null
								) {
									if (indicator.type == "Vejcb1Wvjrc") {
										percentage = totalActual ?? null;
									} else {
										percentage =
											totalActual === totalTarget
												? 100
												: ((totalActual ?? 0) * 100) /
												  (totalTarget || 1);
									}
								}
								const color = indicator.colors?.find(
									(c, index) => {
										return (
											percentage <
												parseFloat(c.endValue) ||
											index == indicator.colors.length - 1
										);
									}
								);

								const toOneDecimal = (value) =>
									!!value && value % 1 !== 0
										? Number(value).toFixed(1)
										: value;

								// remove rows with 0 for total actual and target
								if (!totalActual && !totalTarget) return;

								return {
									id: indicator.id,
									name: indicator.name,
									code: indicator.code,
									quartelyValues: qVals,
									orgUnit,
									orgUnitObj,
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
			console.log("actual map", mappedIndicatorValues);
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
		let indicatorMaps: any[] = [];

		const tagRe = /\s*TAG_(\w+)x?/i; //\s*-\s*(.*)/i;
		const actRe = /\s*ACT_(\w+)x?/i; //\s*-\s*(.*)/i;

		indicatorGroups.forEach((group) => {
			let indicatorMap = {};

			const addIndicatorToMap = (
				key,
				name,
				colors,
				thematicArea,
				type,
				code
			) => {
				if (!indicatorMap.hasOwnProperty(key)) {
					indicatorMap[key] = {
						id: key,
						name: name,
						colors: colors,
						thematicArea,
						type,
						code,
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
						indicator.indicatorType.id,
						indicator.code
					);
					indicatorMap[actMatch[1]].actualId = indicator.id;
				} else {
					const key = indicator.code.replace(/CURRx$/, 'CURR');
					addIndicatorToMap(
						key,
						indicator.description,
						colors,
						thematicArea,
						indicator.indicatorType.id,
						indicator.code
					);
					indicatorMap[key].actualId = indicator.id;
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

	loadUserInfo = async () => {
		const query = {
			me: {
				resource: "me.json",
				params: {
					fields: "userGroups[id]",
				},
			},
		};

		try {
			const data = await this.engine.query(query);
			console.log("loadUserInfo:", data);
			this.userInfo = data.me;
		} catch (e) {
			console.log("error", e);
		}
	};

	loadOrgUnitRoots = async () => {
		const query = {
			orgUnitGroups: {
				resource: "organisationUnitGroups.json",
				params: {
					fields:
						"id,name,organisationUnits[id,name,level,ancestors[id,name,level],parent[id]]",
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
			orgGroupSets: {
				resource: "organisationUnitGroupSets/B8lUy9aLTWq.json",
				params: {
					paging: false,
					fields: "items[id,name]"
				}
			}

		};
		try {
			const data = await this.engine.query(query);
			console.log("loadUserOrgUnits:", data);
			const orgs = data.organisationUnits.organisationUnits;
			const orgUnitGroups = data.orgUnitGroups.organisationUnitGroups;

			this.userOrgUnits = orgs;
			this.orgUnitGroups = orgUnitGroups;
			this.financialyearProjects = data.orgGroupSets.items;
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
					fields:
						"children[id,name,path,leaf, level],ancestors[id,name,level]",
				},
			},
		};
		try {
			const data = await this.engine.query(query);
			const found = data.organisations.organisationUnits.map(
				(unit: any) => {
					return unit.children
						.sort((a, b) =>
							a.name
								.toLowerCase()
								.localeCompare(b.name.toLowerCase())
						)
						.map((child: any) => {
							let leaf =
								child.level == 2 && this.isProjectManager
									? true
									: child.leaf;
							return { ...child, pId: parent, leaf };
						});
				}
			);
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
			console.log("load projects:", data);

			this.thematicAreas = data.thematicAreas.indicatorGroups.map(
				(area) => {
					return {
						...area,
						name: area.name.replace(
							/^\s?Thematic Area\s?-?\s?/i,
							""
						),
					};
				}
			);

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

	get isProjectManager() {
		return this.userInfo?.userGroups.some((g) => g.id === "dyVIA8lyC04");
	}

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
			: !!this.selectedProject
			? [this.selectedProject]
			: [];
	}
	get selectedObjectiveArray() {
		if (this.isProjectManager) {
			const projects = this.selectedProjectArray.map((p) =>
				this.projects.find((pr) => pr.id == p)
			);
			return projects.flatMap((p) => p.objectives).map((o) => o.id);
		}

		return Array.isArray(this.selectedObjective)
			? this.selectedObjective
			: !!this.selectedObjective
			? [this.selectedObjective]
			: [];
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
				return g.organisationUnits.map((org) => {
					if (org.level == this.selectedLevel) return org;
					else
						return org.ancestors.find(
							(a) => a.level == this.selectedLevel
						);
				});
			});
			levelOrgs = uniqBy(levelOrgs, "id");

			console.log("selectedProjects", selectedProjects);
			console.log("orgUnitGroups", orgUnitGroups);
			console.log("levelOrgs", levelOrgs);
		}
		return levelOrgs;
	}

	get hasSelectedOrgUnit() {
		if (!this.selectedOrgUnit)
			return false;

		if (Array.isArray(this.selectedOrgUnit))
			return this.selectedOrgUnit.length > 0;

		return true;
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
			orgUnits = [...new Set(orgUnits)]
		}

		else if (!!this.hasSelectedOrgUnit) {
			orgUnits = Array.isArray(this.selectedOrgUnit)
				? this.selectedOrgUnit
				: [this.selectedOrgUnit];
		}

		else if (!!this.selectedLevel && !!this.selectedProjectOrgs) {
			orgUnits = this.selectedProjectOrgs.map((o) => o.id);
		}

		console.log("orgUnitGroupOrgs", orgUnitGroupOrgs);
		console.log("orgUnits", orgUnits);

		return orgUnits ?? [];
	}

	get selectedYearArray() {
		let years = Array.isArray(this.selectedYear)
			? this.selectedYear
			: [this.selectedYear];

		return years;
	}

	get fieldsSelected() {
		console.log("state", {
			obj: this.selectedObjective,
			proj: this.selectedProject,
			orgA: this.selectedOrgUnitArray,
			themat: this.selectedThematicAreaArray,
			years: this.selectedYearArray,
		});
		return (
			!!this.selectedObjectiveArray?.length &&
			!!this.selectedYearArray?.length &&
			(!!this.selectedOrgUnitArray?.length || !!this.selectedLevel)
		);
	}

	get hasThematicAreas() {
		const hasManyOrgs = this.selectedOrgUnitArray.length > 1;
		const hasManyYrs = this.selectedYearArray.length > 1;
		const hasManyObjectives = this.selectedObjectiveArray.length > 1;
		const hasSelectedThematicArea =
			this.selectedThematicAreaArray.length > 0;
		return (
			//hasManyOrgs ||
			//hasManyYrs ||
			//hasManyObjectives ||
			hasSelectedThematicArea
		);
	}
}

export const StoreContext = React.createContext<Store | null>(null);

/* Hook to use store in any functional component */
export const useStore = () => React.useContext(StoreContext);
