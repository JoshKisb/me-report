import React, { useEffect, useState, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../store";
import { CSVLink } from "react-csv";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useStateWithCallbackLazy } from "use-state-with-callback";

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
	const [loadingCSV, setLoadingCSV] = useState(false);
	const [indicators, setIndicators] = useState([]);
	const [csvData, setCsvData] = useStateWithCallbackLazy([]);
	const csvBtn = useRef(null);

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
	}, [
		store?.selectedObjective,
		store?.selectedOrgUnit,
		store?.selectedYear,
		store?.selectedThematicArea,
	]);

	const prepareCSV = (event) => {
		if (!loadingCSV) {
			setLoadingCSV(true);

			const csv = [
				[
					"OrgUnit",
					"Year",
					"Objective",
					"Indicator",
					"Baseline",
					"Target",
					"Actual",
					"Percentage",
					"Q1",
					"Q2",
					"Q3",
					"Q4",
				],
				...indicators.flatMap((area) =>
					area.values.map((indicator) => [
						area.orgUnit,
						area.year,
						area.objectiveId,
						indicator.name,
						0,
						indicator.target,
						indicator.actual,
						Math.round(indicator.percentage),
						indicator.quartelyValues?.[0],
						indicator.quartelyValues?.[1],
						indicator.quartelyValues?.[2],
						indicator.quartelyValues?.[3],
					])
				),
			];

			setCsvData(csv, () => {
				const btn = csvBtn.current;
				if (!!btn) btn.link.click();
				setLoadingCSV(false);
			});
		}
	};

	const renderIndicatorTableCells = (indicator) => {
		return (
			<>
				<td>{indicator.name}</td>
				<td>0</td>
				<td>{indicator.target}</td>
				<td>{indicator.actual}</td>
				<td style={{ backgroundColor: indicator.color }}>
					{Math.round(indicator.percentage)}%
				</td>
				<td>{indicator.quartelyValues?.[0]}</td>
				<td>{indicator.quartelyValues?.[1]}</td>
				<td>{indicator.quartelyValues?.[2]}</td>
				<td>{indicator.quartelyValues?.[3]}</td>
			</>
		);
	};

	const renderThematicRow = (area) => {
		if (store.hasThematicAreas) {
			return (
				<>
					<tr>
						<td className="thematic-area" rowspan={area.values.length}>
							<div>
								<p>{area.orgUnitName}</p>
								<p>{area.year}</p>
								{(store.selectedThematicAreaArray.length > 0) && (
									<p>{area.objective}</p>
								)}
							</div>
						</td>
						{renderIndicatorTableCells(area.values[0])}
					</tr>
					{area.values.slice(1).map((indicator) => (
						<tr key={indicator.id}>{renderIndicatorTableCells(indicator)}</tr>
					))}
				</>
			);
		} else {
			return (
				<>
					{area.values.map((indicator) => (
						<tr key={indicator.id}>{renderIndicatorTableCells(indicator)}</tr>
					))}
				</>
			);
		}
	};

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
					Select an organisation unit, project, objective and year
					<br /> to view report
				</h5>
			)}
			{!!store.fieldsSelected && !loading && !!indicators && (
				<div>
					<CSVLink
						ref={csvBtn}
						data={csvData}
						filename={"me-report.csv"}
						style={{ display: "none" }}
					/>
					<Button
						type="primary"
						icon={<DownloadOutlined />}
						loading={loadingCSV}
						onClick={prepareCSV}
						style={{ marginBottom: "10px" }}
					>
						Download CSV
					</Button>

					<table className="report-table table table-bordered">
						<thead class="table-dark">
							<tr>
								{store.hasThematicAreas && <th rowspan="2">Thematic Area</th>}
								<th rowspan="2">Indicator (Code)</th>
								<th rowspan="2">Baseline</th>
								<th rowspan="2">Target</th>
								<th rowspan="2">Actual</th>
								<th rowspan="2">% age Achieved</th>
								<th colspan="4">Quarterly Status</th>
							</tr>
							<tr>
								<th>Q1</th>
								<th>Q2</th>
								<th>Q3</th>
								<th>Q4</th>
							</tr>
						</thead>
						<tbody>
							{indicators.map((area) => (
								<React.Fragment key={area.key}>
									{renderThematicRow(area)}
								</React.Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
});
