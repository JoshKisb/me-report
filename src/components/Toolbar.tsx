import React, { useState, useEffect, useRef } from "react";
import { Row, Col, Select, Spin } from "antd";
import { observer } from "mobx-react-lite";
import { Store, useStore } from "../store";
import { OrgUnitTree } from "./OrgUnitTree";

const { Option } = Select;

const styles: any = {
	selectBox: {
		backgroundColor: "#dedede",
		display: "flex",
		flexDirection: "column",
		padding: "4px",
	},
	label: {
		marginBottom: "0px",
		padding: "4px",
	},
};

const reverseRange = (from, to) =>
	[...Array(from - to)].map((_, i) => from - i);

export const Toolbar = observer(() => {
	const store = useStore();
	const [objectives, setObjectives] = useState([]);
	const [loading, setLoading] = useState(false);
	// const [thematicAreas, setThematicAreas] = useState([]);
	const initial = useRef(true);
	const years = reverseRange(new Date().getFullYear(), 2018).map((y) => ({
		label: y,
		value: y,
	}));

	// change objectives when project changes
	useEffect(() => {
		if (!store) return;
		setObjectives([]);
		store.setSelectedObjective([]);

		if (store.selectedProjectArray.length == 0) return;

		console.log("selectedProjectArray", store.selectedProjectArray);
		const projects = store.projects.filter((p) =>
			store.selectedProjectArray.includes(p.id)
		);

		const objectives = projects.flatMap((p) => p.objectives);
		setObjectives(objectives);

		if (initial.current) {
			store.setSelectedObjective([
				"HJbIZqv0VNl",
				"luRWrgWwVtQ",
				"ox87dTItQfr",
			]);
			initial.current = false;
		}
	}, [store?.selectedProject]);

	useEffect(() => {
		if (!store || !store.selectedOrgUnitGroup) return;
		const group = store.orgUnitGroups.find(
			(g) => g.id === store.selectedOrgUnitGroup
		);
		console.log("group", group);
		const project = store.projects.find((p) => p.name === group.name);
		console.log("project", project);
		if (!!project && !store.selectedProjectArray.includes(project.id))
			store.setSelectedProject(
				store.selectedProjectArray.concat(project.id)
			);
	}, [store?.selectedOrgUnitGroup]);

	// change objectives when thematic area changes
	// useEffect(() => {
	// 	if (!store.selectedThematicAreaArray.length) {
	// 		setObjectives([]);
	// 		return;
	// 	}

	// 	const thematicAreaIds = store.selectedThematicAreaArray;
	// 	const projectObj = store.projects.find(
	// 		(p) => p.id === store.selectedProject
	// 	);
	// 	const objectives = projectObj.thematicAreas
	// 		.filter((area) => thematicAreaIds.includes(area.id))
	// 		.map((area) => area.objectives);

	// 	setObjectives(objectives);
	// 	console.log(objectives);
	// }, [store?.selectedThematicArea]);

	useEffect(() => {
		setLoading(true);
		if (!!store) {
			Promise.all([
				store.loadOrgUnitRoots(),
				store.loadProjects(),
			]).finally(() => {
				setLoading(false);
				store.setSelectedOrgUnit(["UqgSgdDNxpA"]);
				// store.setSelectedOrgUnitGroup("zLC9Te91DUs");
				store.setSelectedProject(["JsOhoxYXnXd"]);
			});
		}
	}, [store]);

	if (!store) return;
	return (
		<div className="topBar">
			<Spin spinning={loading}>
				<Row gutter={{ xs: 8, sm: 16 }}>
					<Col className="gutter-row" xs={24} md={4}>
						<div style={styles.selectBox}>
							<p style={styles.label}>Selected OrgUnit Group</p>

							<Select
								showSearch
								placeholder="Select Organisation Unit Group"
								optionFilterProp="label"
								fieldNames={{ label: "name", value: "id" }}
								onChange={store.setSelectedOrgUnitGroup}
								value={store.selectedOrgUnitGroup}
								allowClear={true}
								disabled={!!store?.selectedLevel || !!store?.selectedOrgUnit}
								// mode="multiple"
								options={store.orgUnitGroups}
								filterOption={(input, option) => {
									return (
										option?.name
											.toLowerCase()
											.indexOf(input.toLowerCase()) >= 0
									);
								}}
							/>
						</div>
					</Col>
					<Col className="gutter-row" xs={24} md={5}>
						<div style={styles.selectBox}>
							<p style={styles.label}>Selected OrgUnit</p>
							<OrgUnitTree />
							{/* <Select
								placeholder="Select Organisation Unit Level"
								value={store.selectedLevel}
								onChange={store.setSelectedLevel}
								allowClear={true}
								disabled={!!store.selectedOrgUnitGroup}
							>
								<Option value="1">Level 1</Option>
								<Option value="2">Level 2</Option>
								<Option value="3">Level 3</Option>
								<Option value="4">Level 4</Option>
								<Option value="5">Level 5</Option>
							</Select>
						 */}
						</div>
					</Col>
					<Col className="gutter-row" xs={24} md={3}>
						<div style={styles.selectBox}>
							<p style={styles.label}>Selected Project</p>
							<Select
								showSearch
								placeholder="Select Project"
								optionFilterProp="label"
								fieldNames={{ label: "name", value: "id" }}
								onChange={store.setSelectedProject}
								value={store.selectedProject}
								allowClear={true}
								mode="multiple"
								options={store.projects}
								filterOption={(input, option) => {
									console.log(option);
									return (
										option?.name
											.toLowerCase()
											.indexOf(input.toLowerCase()) >= 0
									);
								}}
							/>
						</div>
					</Col>
					<Col className="gutter-row" xs={24} md={4}>
						<div style={styles.selectBox}>
							<p style={styles.label}>Selected Thematic Area</p>
							<Select
								showSearch
								placeholder="Select Thematic Area"
								optionFilterProp="label"
								fieldNames={{ label: "name", value: "id" }}
								onChange={store.setSelectedThematicArea}
								allowClear={true}
								mode="multiple"
								value={store.selectedThematicArea}
								options={store.thematicAreas}
								filterOption={(input, option) => {
									console.log(option);
									return (
										option?.name
											.toLowerCase()
											.indexOf(input.toLowerCase()) >= 0
									);
								}}
							/>
						</div>
					</Col>
					<Col className="gutter-row" xs={24} md={5} lg={5}>
						<div style={styles.selectBox}>
							<p style={styles.label}>Selected Objective</p>
							<Select
								showSearch
								placeholder="Select Objective"
								optionFilterProp="label"
								fieldNames={{ label: "name", value: "id" }}
								onChange={store.setSelectedObjective}
								allowClear={true}
								style={{ maxHeight: "110px" }}
								mode="multiple"
								value={store.selectedObjective}
								options={objectives}
								filterOption={(input, option: any) => {
									console.log(input, option);
									return (
										option?.name
											.toLowerCase()
											.indexOf(input.toLowerCase()) >= 0
									);
								}}
							/>
						</div>
					</Col>
					<Col className="gutter-row" xs={24} md={3} lg={3}>
						<div style={styles.selectBox}>
							<p style={styles.label}>Selected Year</p>
							<Select
								placeholder="Select Year"
								onChange={store.setSelectedYear}
								allowClear={true}
								options={years}
								mode="multiple"
								value={store.selectedYear}
							/>
						</div>
					</Col>
				</Row>
			</Spin>
		</div>
	);
});
