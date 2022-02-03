import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../store";

const styles = {
	noObjective: {
		textAlign: "center",
		alignSelf: "center",
		width: "100%",
		color: "#6c757d",
	},
};

export const ReportTable = observer(() => {
	const store = useStore();
	const [loading, setLoading] = useState(false);
	const [indicators, setIndicators] = useState(["1"]);

	useEffect(() => {
		if (!store || !store.fieldsSelected) return;
		setLoading(true);

		store
			.fetchIndicators()
			.then((indicators) => {
				setIndicators(indicators);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [store?.selectedObjective, store?.selectedOrgUnit, store?.selectedYear]);

	return (
		<div className="report">
			{loading && (
				<div className="loadingWrapper">
					<div
						class="spinner-border"
						style={{ width: "3rem", height: "3rem" }}
						role="status"
					></div>
				</div>
			)}

			{!store.fieldsSelected && !loading && (
				<h5 style={styles.noObjective}>
					Select an organisation unit, project, objective and year<br /> to view report
				</h5>
			)}
			{!!store.fieldsSelected && !loading && (
				<table className="report-table table table-bordered">
					<thead class="table-dark">
						<tr>
							<td rowspan="2">Indicator (Code)</td>
							<td rowspan="2">Baseline</td>
							<td rowspan="2">Target</td>
							<td rowspan="2">Actual</td>
							<td rowspan="2">% age Achieved</td>
							<td colspan="4">Quarterly Status</td>
						</tr>
						<tr>
							<td>Q1</td>
							<td>Q2</td>
							<td>Q3</td>
							<td>Q4</td>
						</tr>
					</thead>
					<tbody>
						{indicators.map((indicator) => (
							<tr key={indicator.id}>
								<td>{indicator.name}</td>
								<td>0</td>
								<td>{indicator.target}</td>
								<td>{indicator.actual}</td>
								<td style={{ backgroundColor: indicator.color }}>
									{Math.round(indicator.percentage)}%
								</td>
								<td>{indicator.quartelyValues?.[1]}</td>
								<td>{indicator.quartelyValues?.[2]}</td>
								<td>{indicator.quartelyValues?.[3]}</td>
								<td>{indicator.quartelyValues?.[4]}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
});
