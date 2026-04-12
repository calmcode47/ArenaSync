import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Alert_Key {
  id: UUIDString;
  __typename?: 'Alert_Key';
}

export interface CreateAlertData {
  alert_insert: Alert_Key;
}

export interface CreateAlertVariables {
  zoneId: UUIDString;
  alertType: string;
  message: string;
  status: string;
}

export interface Event_Key {
  id: UUIDString;
  __typename?: 'Event_Key';
}

export interface GetEventDetailsData {
  event?: {
    id: UUIDString;
    name: string;
    date: DateString;
    location: string;
    description?: string | null;
    venueCapacity?: number | null;
    zones_on_event: ({
      id: UUIDString;
      name: string;
      type: string;
      criticalCapacity: number;
    } & Zone_Key)[];
  } & Event_Key;
}

export interface GetEventDetailsVariables {
  id: UUIDString;
}

export interface GetMyZoneTelemetryData {
  telemetryDatas: ({
    timestamp: TimestampString;
    dataType: string;
    value: number;
    source?: string | null;
  })[];
}

export interface GetMyZoneTelemetryVariables {
  zoneId: UUIDString;
}

export interface ListAllEventsData {
  events: ({
    id: UUIDString;
    name: string;
    date: DateString;
    location: string;
    description?: string | null;
    venueCapacity?: number | null;
  } & Event_Key)[];
}

export interface Prediction_Key {
  id: UUIDString;
  __typename?: 'Prediction_Key';
}

export interface TelemetryData_Key {
  id: UUIDString;
  __typename?: 'TelemetryData_Key';
}

export interface Zone_Key {
  id: UUIDString;
  __typename?: 'Zone_Key';
}

interface ListAllEventsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllEventsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllEventsData, undefined>;
  operationName: string;
}
export const listAllEventsRef: ListAllEventsRef;

export function listAllEvents(options?: ExecuteQueryOptions): QueryPromise<ListAllEventsData, undefined>;
export function listAllEvents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllEventsData, undefined>;

interface GetEventDetailsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEventDetailsVariables): QueryRef<GetEventDetailsData, GetEventDetailsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetEventDetailsVariables): QueryRef<GetEventDetailsData, GetEventDetailsVariables>;
  operationName: string;
}
export const getEventDetailsRef: GetEventDetailsRef;

export function getEventDetails(vars: GetEventDetailsVariables, options?: ExecuteQueryOptions): QueryPromise<GetEventDetailsData, GetEventDetailsVariables>;
export function getEventDetails(dc: DataConnect, vars: GetEventDetailsVariables, options?: ExecuteQueryOptions): QueryPromise<GetEventDetailsData, GetEventDetailsVariables>;

interface CreateAlertRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAlertVariables): MutationRef<CreateAlertData, CreateAlertVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAlertVariables): MutationRef<CreateAlertData, CreateAlertVariables>;
  operationName: string;
}
export const createAlertRef: CreateAlertRef;

export function createAlert(vars: CreateAlertVariables): MutationPromise<CreateAlertData, CreateAlertVariables>;
export function createAlert(dc: DataConnect, vars: CreateAlertVariables): MutationPromise<CreateAlertData, CreateAlertVariables>;

interface GetMyZoneTelemetryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyZoneTelemetryVariables): QueryRef<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyZoneTelemetryVariables): QueryRef<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
  operationName: string;
}
export const getMyZoneTelemetryRef: GetMyZoneTelemetryRef;

export function getMyZoneTelemetry(vars: GetMyZoneTelemetryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
export function getMyZoneTelemetry(dc: DataConnect, vars: GetMyZoneTelemetryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;

