import React, { useEffect, useState, useRef } from "react";
import { observer } from "mobx-react-lite";
import { Store, useStore } from "../store";
import { CSVLink } from "react-csv";
import { Button, Drawer, Checkbox, Input } from "antd";
import { DownloadOutlined, FilterOutlined } from "@ant-design/icons";
import { useStateWithCallbackLazy } from "use-state-with-callback";

const styles = {
	noObjective: {
		textAlign: "center",
		alignSelf: "center",
		width: "100%",
		color: "#6c757d",
	},
};

// const { Search } = Input;
const NA = "-";

export const ReportTable = observer(() => {
	const store = useStore() as Store;
	const [loading, setLoading] = useState(false);
	const [loadingCSV, setLoadingCSV] = useState(false);
	const [indicators, setIndicators] = useState([]);
	const [filteredIndicators, setFilteredIndicators] = useState<any>([]);
	const [filters, setFilters] = useState([]);
	const [idxFilters, setIdxFilters] = useState([]);
	const [search, setSearch] = useState("");
	const [csvData, setCsvData] = useStateWithCallbackLazy([]);
	const csvBtn = useRef(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		console.log("checking state", store?.fieldsSelected);
		if (!store || !store.fieldsSelected) return;
		setLoading(true);

		store
			.fetchIndicators()
			.then((_indicators) => {
				setIndicators(_indicators);
			})
			.finally(() => {
				console.log("hasThematicAreas", store.hasThematicAreas);
				setLoading(false);
			});
	}, [
		store?.selectedObjective,
		store?.selectedOrgUnit,
		store?.selectedLevel,
		store?.selectedOrgUnitGroup,
		store?.selectedYear,
		store?.selectedThematicArea,
		store?.selectedProject,
	]);

	useEffect(() => {
		filterIndicators();
	}, [filters, indicators]);

	useEffect(() => {
		if (!store) return;
		let idx = store.indicators;
		const _search = search.toLowerCase();

		if (!!_search) {
			idx = idx.filter((i) => {
				return (
					i.name.toLowerCase().indexOf(_search) >= 0 ||
					i.id.toLowerCase().indexOf(_search) >= 0
				);
			});
		}
		setIdxFilters(idx);
	}, [indicators, search]);

	const filterIndicators = () => {
		let filtered: any[] = indicators ?? [];

		if (filters.length > 0) {
			filtered = indicators.map((area) => {
				const vals = area.values.filter((indx) =>
					filters.includes(indx.id)
				);
				return {
					...area,
					values: vals,
				};
			});
		}
		filtered = filtered
			.filter((area) => area.values.length > 0)
			.map(ind => ({...ind, values: ind.values.sort((a, b) => a.code.localeCompare(b.code))}));
		
		console.log("filt", filtered);
		setFilteredIndicators(filtered);
	};

	const getFilterIndicators = () => {
		return (
			store.indicators?.filter((i) => {
				return filters.includes(i.id);
			}) ?? []
		);
	};

	const prepareCSV = (event) => {
		if (!loadingCSV) {
			setLoadingCSV(true);

			const csv = [
				[
					"OrgUnit",
					"OrgUnit Name",
					"Hierarchy",
					"Year",
					"Objective",
					"Objective Id",
					"Indicator",
					// "Baseline",
					"Target",
					"Actual",
					"Percentage",
					"Q1",
					"Q2",
					"Q3",
					"Q4",
				],
				...indicators.flatMap((area: any) =>
					area.values.map((indicator) => [
						indicator.orgUnit,
						indicator.orgUnitObj.name,
						indicator.orgUnitObj.ancestors
							?.map((a) => a.name)
							.concat(indicator.orgUnitObj.name)
							.join("/"),
						indicator.year,
						area.objective,
						area.objectiveId,
						indicator.name,
						// 0,
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

	const showDrawer = () => {
		setVisible(true);
	};

	const onClose = () => {
		setVisible(false);
	};

	const onFilter = (checkedValues) => {
		setFilters(checkedValues);
	};

	const onSearch = (e) => {
		// console.log("Search", e);
		setSearch(e.target.value);
	};

	const cellStyle = (indicator) => {
		let style: any = {};
		if (indicator.percentage != null) {
			style.backgroundColor = indicator.color;

			if (indicator.color == "#e41a1c") style.color = "#fff";
		}

		return style;
	};

	const renderIndicatorTableCells = (indicator) => {
		// console.log("indi", indicator);
		return (
			<>
				<td>{indicator.year}</td>
				<td>{indicator.orgUnitObj.name}</td>
				<td>{indicator.name}</td>
				{/* <td>0</td> */}
				<td>{indicator.target ?? NA}</td>
				<td>{indicator.actual ?? NA}</td>
				<td style={cellStyle(indicator)}>
					{indicator.percentage != null
						? `${indicator.percentage}%`
						: NA}
				</td>
				<td>{indicator.quartelyValues?.[0] ?? NA}</td>
				<td>{indicator.quartelyValues?.[1] ?? NA}</td>
				<td>{indicator.quartelyValues?.[2] ?? NA}</td>
				<td>{indicator.quartelyValues?.[3] ?? NA}</td>
			</>
		);
	};

	const renderThematicRow = (area) => {
		if (store.hasThematicAreas) {
			return (
				<>
					<tr>
						<td
							className="thematic-area"
							rowSpan={area.values.length}
						>
							<div>
								{store.selectedThematicAreaArray.length > 0 && (
									<p>{area.thematicArea}</p>
								)}
							</div>
						</td>
						{renderIndicatorTableCells(area.values[0])}
					</tr>
					{area.values
						.slice(1)
						.filter((i) => !!i)
						.map((indicator) => (
							<tr key={indicator.id}>
								{renderIndicatorTableCells(indicator)}
							</tr>
						))}
				</>
			);
		} else {
			return (
				<>
					{area.values
						.filter((i) => !!i)
						.map((indicator) => (
							<tr key={indicator.id}>
								{renderIndicatorTableCells(indicator)}
							</tr>
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
						className="spinner-border"
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

					<div className="d-flex mb-3">
						<div className="filterBtn">
							<Button
								icon={<FilterOutlined />}
								onClick={showDrawer}
							/>
						</div>
						<div className="filterList">
							{getFilterIndicators().map((i) => (
								<span
									key={i.id}
									className="me-2 mb-1 px-2 badge rounded-pill bg-info text-dark"
								>
									{i.name}
								</span>
							))}
						</div>
					</div>

					<Drawer
						title="Filter Indicators"
						placement="right"
						width={720}
						onClose={onClose}
						visible={visible}
						bodyStyle={{ paddingTop: 0 }}
					>
						<div className="filterSearch">
							<Input
								placeholder="Search..."
								allowClear
								onChange={onSearch}
								style={{ width: "100%" }}
							/>
						</div>

						<Checkbox.Group
							style={{ width: "100%", marginTop: "12px" }}
							onChange={onFilter}
						>
							{idxFilters.map((indicator) => (
								<p key={indicator.id}>
									<Checkbox value={indicator.id}>
										{indicator.name}
									</Checkbox>
								</p>
							))}
						</Checkbox.Group>
					</Drawer>

					<table className="report-table table table-bordered">
						<thead className="table-dark">
							<tr>
								{store.hasThematicAreas && (
									<th rowspan="2">Thematic Area</th>
								)}
								<th rowspan="2">Year</th>
								<th rowspan="2">Org Unit</th>
								<th rowspan="2">Indicator (Code)</th>
								{/* <th rowspan="2">Baseline</th> */}
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
							{filteredIndicators
								.filter((a) => a.values.length > 0)
								.map((area) => (
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
