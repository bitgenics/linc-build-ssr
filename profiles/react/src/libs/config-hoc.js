const wrapInStoreHoCFn = (state, routeComponent) => {
	return routeComponent;
}

const wrapInStoreHoC = {
  fn: wrapInStoreHoCFn
}

export { wrapInStoreHoC }