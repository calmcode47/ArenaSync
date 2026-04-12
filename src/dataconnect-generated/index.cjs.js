const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'arenasync',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
exports.dataConnectSettings = dataConnectSettings;

const listAllEventsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllEvents');
}
listAllEventsRef.operationName = 'ListAllEvents';
exports.listAllEventsRef = listAllEventsRef;

exports.listAllEvents = function listAllEvents(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllEventsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getEventDetailsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetEventDetails', inputVars);
}
getEventDetailsRef.operationName = 'GetEventDetails';
exports.getEventDetailsRef = getEventDetailsRef;

exports.getEventDetails = function getEventDetails(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getEventDetailsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createAlertRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAlert', inputVars);
}
createAlertRef.operationName = 'CreateAlert';
exports.createAlertRef = createAlertRef;

exports.createAlert = function createAlert(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createAlertRef(dcInstance, inputVars));
}
;

const getMyZoneTelemetryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyZoneTelemetry', inputVars);
}
getMyZoneTelemetryRef.operationName = 'GetMyZoneTelemetry';
exports.getMyZoneTelemetryRef = getMyZoneTelemetryRef;

exports.getMyZoneTelemetry = function getMyZoneTelemetry(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyZoneTelemetryRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;
