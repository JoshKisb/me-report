import React, { useState, useEffect } from "react";
import { Row, Col, Select } from "antd";
import { OrgUnitTree } from "./OrgUnitTree";
import { observer } from "mobx-react-lite";
import { useStore } from "../store";

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
	const years = reverseRange(new Date().getFullYear(), 2018).map((y) => ({
		label: y,
		value: y,
	}));

	const handleProjectSelect = (project) => {
		if (project === store.selectedProject) return;
		store.setSelectedProject(project);
		store.setSelectedObjective(null);
		const projectObj = store.projects.find((p) => p.id === project);
		setObjectives(projectObj.objectives);
	};

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
				<Col className="gutter-row" xs={24} md={5}>
					<div style={styles.selectBox}>
						<p style={styles.label}>Selected Project</p>
						<Select
							showSearch
							placeholder="Select Project"
							optionFilterProp="label"
							fieldNames={{ label: "name", value: "id" }}
							onChange={handleProjectSelect}
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
				<Col className="gutter-row" xs={24} md={8} lg={9}>
					<div style={styles.selectBox}>
						<p style={styles.label}>Selected Objective</p>
						<Select
							showSearch
							placeholder="Select Objective"
							optionFilterProp="label"
							fieldNames={{ label: "name", value: "id" }}
							onChange={store.setSelectedObjective}
							allowClear={true}
							options={objectives}
							value={store.selectedObjective}
							filterOption={(input, option) => {
								return (
									option.name
										.toLowerCase()
										.indexOf(input.toLowerCase()) >= 0
								);
							}}
						/>
					</div>
				</Col>
				<Col className="gutter-row" xs={24} md={4} lg={3}>
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
