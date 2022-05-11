import React from "react";
// import { DataQuery, CustomDataProvider } from "@dhis2/app-runtime";
import { useDataEngine } from "@dhis2/app-runtime";
import classes from "./App.module.css";
import { Toolbar } from "./components/Toolbar";
import { ReportTable } from "./components/ReportTable";
import { Store, StoreContext } from "./store";

// import "./App.less";
import "./theme.scss";

const query = {
    me: {
        resource: "me",
    },
};

const MyApp = () => {
    const engine = useDataEngine();
    const store = new Store(engine);

    return (
        <StoreContext.Provider value={store}>
            <div className={classes.container}>
                <Toolbar />
                <ReportTable />
            </div>
        </StoreContext.Provider>
    );
};
{
    /*<DataQuery query={query}>
            {({ error, loading, data }) => {
                if (error) return <span>ERROR</span>
                if (loading) return <span>...</span>
                return (
                    <>
                        <h1>
                            {i18n.t('Hello {{name}}', { name: data.me.name })}
                        </h1>
                        <h3>{i18n.t('Welcome to DHIS2!')}</h3>
                    </>
                )
            }}
        </DataQuery>*/
}

export default MyApp;
