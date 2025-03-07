const GlobalConsts = {};
const modules = import.meta.glob('./modules/**/*.js', { eager: true });
Object.entries(modules).forEach(([path, moduleExports]) => {
  const { default: defaultExport, ...restExports } = moduleExports;
  Object.assign(GlobalConsts, restExports, defaultExport || {});
});

export default GlobalConsts;
