import { YearQuarterValues } from "../interfaces/YearQuarterValues";

export const quarterPeriods = (year, financialYear = true) => {
	if (financialYear) {
		return [
			`${year}`,
			`${year}Q4`,
			`${year + 1}Q1`,
			`${year + 1}Q2`,
			`${year + 1}Q3`,
		];
	} else {
		return [`${year}`, `${year}Q1`, `${year}Q2`, `${year}Q3`, `${year}Q4`];
	}
};

export const getQuarterValues = (
	year,
	indicator,
	rows,
	indexes,
	financialYear = false
): YearQuarterValues => {
	let values: YearQuarterValues = [];

	const getRow = (type: "actual" | "target", period) => {
		const actTag = type === "actual" ? "UwHkqmSsQ7i" : "MAKKtv2MQbt";
		rows.find(
			(row) =>
				row[indexes.dx] === indicator.actualId &&
				row[indexes.pe] === period &&
				row[indexes.rJ9cwmnKoP1] === actTag
		);
	};
	if (!financialYear) {
		quarterPeriods(year, false)
			.slice(1)
			.forEach((period) => {
				const actualRow = getRow("actual", period);
				const targetRow = getRow("target", period);

				const actualValue = actualRow?.[indexes.value];
				const targetValue = targetRow?.[indexes.value];
				values.push({
					actual: {
						value: !!actualValue ? parseFloat(actualValue) : null,
						numerator: parseFloat(
							actualRow?.[indexes.numerator] || "0"
						),
						denominator: parseFloat(
							actualRow?.[indexes.denominator] || "0"
						),
					},
					target: {
						value: !!targetValue ? parseFloat(targetValue) : null,
						numerator: parseFloat(
							targetRow?.[indexes.numerator] || "0"
						),
						denominator: parseFloat(
							targetRow?.[indexes.denominator] || "0"
						),
					},
				});
			});
	}

	return values;
};
