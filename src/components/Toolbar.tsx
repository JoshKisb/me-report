import React, { useState, useEffect } from "react";
import { Row, Col, Select } from "antd";
import { OrgUnitTree } from "./OrgUnitTree";
import { observer } from "mobx-react-lite";
import { useStore } from "../store";

const { Option } = Select;

const styles = {
	selectBox: {
		backgroundColor: "#dedede",
		display: "flex",
		flexDirection: "column",
		padding: "8px",
	},
	label: {
		marginBottom: "5px",
	},
};

const reverseRange = (from, to) =>
	[...Array(from - to)].map((_, i) => from - i);

export const Toolbar = observer(() => {
	const store = useStore();
	const [objectives, setObjectives] = useState([]);
	const [thematicAreas, setThematicAreas] = useState([]);
	const years = reverseRange(new Date().getFullYear(), 2018).map((y) => ({
		label: y,
		value: y,
	}));

	// change objectives when project changes
	useEffect(() => {
		setObjectives([]);
		store.setSelectedObjective(null);

		if (!store.selectedProject) return;

		const projectObj = store.projects.find(
			(p) => p.id === store.selectedProject
		);
		setObjectives(projectObj.objectives);
	}, [store?.selectedProject]);

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
		store.loadProjects();
	}, []);

	return (
		<div className="topBar">
			<Row gutter={{ xs: 8, sm: 16 }}>
				<Col className="gutter-row" xs={24} md={7}>
					<div style={styles.selectBox}>
						<p style={styles.label}>Selected Organisation Unit</p>
						<OrgUnitTree />
					</div>
				</Col>
				<Col className="gutter-row" xs={24} md={4}>
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
							options={store.projects}
							filterOption={(input, option) => {
								console.log(option);
								return (
									option.name
										.toLowerCase()
										.indexOf(input.toLowerCase()) >= 0
								);
							}}
						/>
					</div>
				</Col>
				<Col className="gutter-row" xs={24} md={5}>
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
							options={store.thematicAreas}
							filterOption={(input, option) => {
								console.log(option);
								return (
									option.name
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
							// mode="multiple"
							value={store.selectedObjective}
							options={objectives}
							filterOption={(input, option) => {
								console.log(input, option);
								return (
									option.name
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
		</div>
	);
});
