import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { TreeSelect } from "antd";
import { useStore } from "../store";
import { debounce } from "lodash";

export const OrgUnitTree = observer(() => {
	const [units, setUnits] = useState([]);
	const store = useStore();

	const onLoadData = async (treeNode: any) => {
		await store.loadOrganisationUnitsChildren(treeNode.id);
		setUnits(store.organisationUnits);
	};

	const onSearch = debounce(async (value: string) => {
		if (!value || value.length < 2) return;
		await store.loadSearchOrganisationUnits(value);
		setUnits(store.organisationUnits);
	}, 750);

	useEffect(() => {
		if (store.userOrgUnits?.length) {
			setUnits(store.organisationUnits);
		} else {
			store.loadOrgUnitRoots().then(() => {
				setUnits(store.organisationUnits);
			});
		}
	}, [store]);

	return (
		<div className="w-5/12 pr-1">
			<TreeSelect
				allowClear={true}
				treeDataSimpleMode
				multiple
				showSearch={true}
				disabled={!!store.selectedOrgUnitGroup}
				style={{ width: "100%" }}
				value={store.selectedOrgUnit}
				dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
				placeholder={"Select Organisation Unit"}
				onChange={store.setSelectedOrgUnit}
				loadData={onLoadData}
				// treeNodeFilterProp='title'
				treeData={units}
				onSearch={onSearch}
				filterTreeNode={(search, item) => {
				   return item.title.toLowerCase().indexOf(search.toLowerCase()) >= 0;
				}}
			/>
		</div>
	);
});
