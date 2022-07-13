interface SingleQuarterValue {
   value: number | null;
   numerator?: number;
   denominator?: number;
}

interface QuarterValues {
   actual: SingleQuarterValue;
   target: SingleQuarterValue;
}

export type YearQuarterValues = QuarterValues[];