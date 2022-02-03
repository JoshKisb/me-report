import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { TreeSelect } from "antd";
import { useStore } from "../store";

export const OrgUnitTree = observer(() => {
	const [units, setUnits] = useState([]);
	const store = useStore();

	const onLoadData = async (treeNode: any) => {
		await store.loadOrganisationUnitsChildren(treeNode.id);
		setUnits(store.organisationUnits);
	};

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
				style={{ width: "100%" }}
				value={store.selectedOrgUnit}
				dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
				placeholder={"Select Organisation Unit"}
				onChange={store.setSelectedOrgUnit}
				loadData={onLoadData}
				treeData={units}
			/>
		</div>
	);
});
