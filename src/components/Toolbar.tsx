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

export const Toolbar = observer(() => {
	const store = useStore();
	const [objectives, setObjectives] = useState([]);

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
			<Row gutter={{ xs: 8, sm: 16, md: 24 }}>
				{/*<Col className="gutter-row" xs={24} md={10}>
					<div style={styles.selectBox}>
						<p style={styles.label}>Selected Organisation Unit</p>
						<OrgUnitTree />
					</div>
				</Col>*/}
				<Col className="gutter-row" xs={24} md={10} lg={8}>
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
				<Col className="gutter-row" xs={24} md={10} lg={8}>
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
			</Row>
		</div>
	);
});
