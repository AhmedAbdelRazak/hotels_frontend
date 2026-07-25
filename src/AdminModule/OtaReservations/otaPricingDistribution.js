/** @format */

const finitePositiveInteger = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : 1;
};

const moneyCents = (value) => {
	const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
	return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
};

const closestReachableIncrement = (weights, target) => {
	const reachable = new Map([[0, []]]);
	weights.forEach((weight, index) => {
		const additions = [];
		for (const [sum, indexes] of reachable.entries()) {
			const next = sum + weight;
			if (!reachable.has(next)) additions.push([next, [...indexes, index]]);
		}
		additions.forEach(([sum, indexes]) => reachable.set(sum, indexes));
	});

	let bestSum = 0;
	for (const sum of reachable.keys()) {
		const distance = Math.abs(sum - target);
		const bestDistance = Math.abs(bestSum - target);
		if (distance < bestDistance || (distance === bestDistance && sum < bestSum)) {
			bestSum = sum;
		}
	}
	return new Set(reachable.get(bestSum) || []);
};

export const allocateWeightedTotal = (totalValue, rawWeights = []) => {
	const totalCents = moneyCents(totalValue);
	const weights = rawWeights.map(finitePositiveInteger);
	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	if (!totalCents || !totalWeight) {
		return { unitAmounts: [], actualTotal: 0, exact: totalCents === 0 };
	}

	const baseUnitCents = Math.floor(totalCents / totalWeight);
	const remainderCents = totalCents - baseUnitCents * totalWeight;
	const incrementedIndexes = closestReachableIncrement(weights, remainderCents);
	const unitCents = weights.map(
		(_, index) => baseUnitCents + (incrementedIndexes.has(index) ? 1 : 0),
	);
	const actualTotalCents = unitCents.reduce(
		(sum, cents, index) => sum + cents * weights[index],
		0,
	);

	return {
		unitAmounts: unitCents.map((cents) => cents / 100),
		actualTotal: actualTotalCents / 100,
		exact: actualTotalCents === totalCents,
	};
};

