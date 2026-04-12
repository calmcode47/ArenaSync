import { ListAllEventsData, GetEventDetailsData, GetEventDetailsVariables, CreateAlertData, CreateAlertVariables, GetMyZoneTelemetryData, GetMyZoneTelemetryVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllEvents(options?: useDataConnectQueryOptions<ListAllEventsData>): UseDataConnectQueryResult<ListAllEventsData, undefined>;
export function useListAllEvents(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllEventsData>): UseDataConnectQueryResult<ListAllEventsData, undefined>;

export function useGetEventDetails(vars: GetEventDetailsVariables, options?: useDataConnectQueryOptions<GetEventDetailsData>): UseDataConnectQueryResult<GetEventDetailsData, GetEventDetailsVariables>;
export function useGetEventDetails(dc: DataConnect, vars: GetEventDetailsVariables, options?: useDataConnectQueryOptions<GetEventDetailsData>): UseDataConnectQueryResult<GetEventDetailsData, GetEventDetailsVariables>;

export function useCreateAlert(options?: useDataConnectMutationOptions<CreateAlertData, FirebaseError, CreateAlertVariables>): UseDataConnectMutationResult<CreateAlertData, CreateAlertVariables>;
export function useCreateAlert(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAlertData, FirebaseError, CreateAlertVariables>): UseDataConnectMutationResult<CreateAlertData, CreateAlertVariables>;

export function useGetMyZoneTelemetry(vars: GetMyZoneTelemetryVariables, options?: useDataConnectQueryOptions<GetMyZoneTelemetryData>): UseDataConnectQueryResult<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
export function useGetMyZoneTelemetry(dc: DataConnect, vars: GetMyZoneTelemetryVariables, options?: useDataConnectQueryOptions<GetMyZoneTelemetryData>): UseDataConnectQueryResult<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
