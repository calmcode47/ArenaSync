# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllEvents*](#listallevents)
  - [*GetEventDetails*](#geteventdetails)
  - [*GetMyZoneTelemetry*](#getmyzonetelemetry)
- [**Mutations**](#mutations)
  - [*CreateAlert*](#createalert)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllEvents
You can execute the `ListAllEvents` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllEvents(options?: ExecuteQueryOptions): QueryPromise<ListAllEventsData, undefined>;

interface ListAllEventsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllEventsData, undefined>;
}
export const listAllEventsRef: ListAllEventsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllEvents(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllEventsData, undefined>;

interface ListAllEventsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllEventsData, undefined>;
}
export const listAllEventsRef: ListAllEventsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllEventsRef:
```typescript
const name = listAllEventsRef.operationName;
console.log(name);
```

### Variables
The `ListAllEvents` query has no variables.
### Return Type
Recall that executing the `ListAllEvents` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllEventsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListAllEvents`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllEvents } from '@dataconnect/generated';


// Call the `listAllEvents()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllEvents();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllEvents(dataConnect);

console.log(data.events);

// Or, you can use the `Promise` API.
listAllEvents().then((response) => {
  const data = response.data;
  console.log(data.events);
});
```

### Using `ListAllEvents`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllEventsRef } from '@dataconnect/generated';


// Call the `listAllEventsRef()` function to get a reference to the query.
const ref = listAllEventsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllEventsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.events);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.events);
});
```

## GetEventDetails
You can execute the `GetEventDetails` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getEventDetails(vars: GetEventDetailsVariables, options?: ExecuteQueryOptions): QueryPromise<GetEventDetailsData, GetEventDetailsVariables>;

interface GetEventDetailsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetEventDetailsVariables): QueryRef<GetEventDetailsData, GetEventDetailsVariables>;
}
export const getEventDetailsRef: GetEventDetailsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getEventDetails(dc: DataConnect, vars: GetEventDetailsVariables, options?: ExecuteQueryOptions): QueryPromise<GetEventDetailsData, GetEventDetailsVariables>;

interface GetEventDetailsRef {
  ...
  (dc: DataConnect, vars: GetEventDetailsVariables): QueryRef<GetEventDetailsData, GetEventDetailsVariables>;
}
export const getEventDetailsRef: GetEventDetailsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getEventDetailsRef:
```typescript
const name = getEventDetailsRef.operationName;
console.log(name);
```

### Variables
The `GetEventDetails` query requires an argument of type `GetEventDetailsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetEventDetailsVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetEventDetails` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetEventDetailsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetEventDetails`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getEventDetails, GetEventDetailsVariables } from '@dataconnect/generated';

// The `GetEventDetails` query requires an argument of type `GetEventDetailsVariables`:
const getEventDetailsVars: GetEventDetailsVariables = {
  id: ..., 
};

// Call the `getEventDetails()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getEventDetails(getEventDetailsVars);
// Variables can be defined inline as well.
const { data } = await getEventDetails({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getEventDetails(dataConnect, getEventDetailsVars);

console.log(data.event);

// Or, you can use the `Promise` API.
getEventDetails(getEventDetailsVars).then((response) => {
  const data = response.data;
  console.log(data.event);
});
```

### Using `GetEventDetails`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getEventDetailsRef, GetEventDetailsVariables } from '@dataconnect/generated';

// The `GetEventDetails` query requires an argument of type `GetEventDetailsVariables`:
const getEventDetailsVars: GetEventDetailsVariables = {
  id: ..., 
};

// Call the `getEventDetailsRef()` function to get a reference to the query.
const ref = getEventDetailsRef(getEventDetailsVars);
// Variables can be defined inline as well.
const ref = getEventDetailsRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getEventDetailsRef(dataConnect, getEventDetailsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.event);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.event);
});
```

## GetMyZoneTelemetry
You can execute the `GetMyZoneTelemetry` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyZoneTelemetry(vars: GetMyZoneTelemetryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;

interface GetMyZoneTelemetryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyZoneTelemetryVariables): QueryRef<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
}
export const getMyZoneTelemetryRef: GetMyZoneTelemetryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyZoneTelemetry(dc: DataConnect, vars: GetMyZoneTelemetryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;

interface GetMyZoneTelemetryRef {
  ...
  (dc: DataConnect, vars: GetMyZoneTelemetryVariables): QueryRef<GetMyZoneTelemetryData, GetMyZoneTelemetryVariables>;
}
export const getMyZoneTelemetryRef: GetMyZoneTelemetryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyZoneTelemetryRef:
```typescript
const name = getMyZoneTelemetryRef.operationName;
console.log(name);
```

### Variables
The `GetMyZoneTelemetry` query requires an argument of type `GetMyZoneTelemetryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyZoneTelemetryVariables {
  zoneId: UUIDString;
}
```
### Return Type
Recall that executing the `GetMyZoneTelemetry` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyZoneTelemetryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyZoneTelemetryData {
  telemetryDatas: ({
    timestamp: TimestampString;
    dataType: string;
    value: number;
    source?: string | null;
  })[];
}
```
### Using `GetMyZoneTelemetry`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyZoneTelemetry, GetMyZoneTelemetryVariables } from '@dataconnect/generated';

// The `GetMyZoneTelemetry` query requires an argument of type `GetMyZoneTelemetryVariables`:
const getMyZoneTelemetryVars: GetMyZoneTelemetryVariables = {
  zoneId: ..., 
};

// Call the `getMyZoneTelemetry()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyZoneTelemetry(getMyZoneTelemetryVars);
// Variables can be defined inline as well.
const { data } = await getMyZoneTelemetry({ zoneId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyZoneTelemetry(dataConnect, getMyZoneTelemetryVars);

console.log(data.telemetryDatas);

// Or, you can use the `Promise` API.
getMyZoneTelemetry(getMyZoneTelemetryVars).then((response) => {
  const data = response.data;
  console.log(data.telemetryDatas);
});
```

### Using `GetMyZoneTelemetry`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyZoneTelemetryRef, GetMyZoneTelemetryVariables } from '@dataconnect/generated';

// The `GetMyZoneTelemetry` query requires an argument of type `GetMyZoneTelemetryVariables`:
const getMyZoneTelemetryVars: GetMyZoneTelemetryVariables = {
  zoneId: ..., 
};

// Call the `getMyZoneTelemetryRef()` function to get a reference to the query.
const ref = getMyZoneTelemetryRef(getMyZoneTelemetryVars);
// Variables can be defined inline as well.
const ref = getMyZoneTelemetryRef({ zoneId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyZoneTelemetryRef(dataConnect, getMyZoneTelemetryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.telemetryDatas);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.telemetryDatas);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAlert
You can execute the `CreateAlert` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAlert(vars: CreateAlertVariables): MutationPromise<CreateAlertData, CreateAlertVariables>;

interface CreateAlertRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAlertVariables): MutationRef<CreateAlertData, CreateAlertVariables>;
}
export const createAlertRef: CreateAlertRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAlert(dc: DataConnect, vars: CreateAlertVariables): MutationPromise<CreateAlertData, CreateAlertVariables>;

interface CreateAlertRef {
  ...
  (dc: DataConnect, vars: CreateAlertVariables): MutationRef<CreateAlertData, CreateAlertVariables>;
}
export const createAlertRef: CreateAlertRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAlertRef:
```typescript
const name = createAlertRef.operationName;
console.log(name);
```

### Variables
The `CreateAlert` mutation requires an argument of type `CreateAlertVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAlertVariables {
  zoneId: UUIDString;
  alertType: string;
  message: string;
  status: string;
}
```
### Return Type
Recall that executing the `CreateAlert` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAlertData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAlertData {
  alert_insert: Alert_Key;
}
```
### Using `CreateAlert`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAlert, CreateAlertVariables } from '@dataconnect/generated';

// The `CreateAlert` mutation requires an argument of type `CreateAlertVariables`:
const createAlertVars: CreateAlertVariables = {
  zoneId: ..., 
  alertType: ..., 
  message: ..., 
  status: ..., 
};

// Call the `createAlert()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAlert(createAlertVars);
// Variables can be defined inline as well.
const { data } = await createAlert({ zoneId: ..., alertType: ..., message: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAlert(dataConnect, createAlertVars);

console.log(data.alert_insert);

// Or, you can use the `Promise` API.
createAlert(createAlertVars).then((response) => {
  const data = response.data;
  console.log(data.alert_insert);
});
```

### Using `CreateAlert`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAlertRef, CreateAlertVariables } from '@dataconnect/generated';

// The `CreateAlert` mutation requires an argument of type `CreateAlertVariables`:
const createAlertVars: CreateAlertVariables = {
  zoneId: ..., 
  alertType: ..., 
  message: ..., 
  status: ..., 
};

// Call the `createAlertRef()` function to get a reference to the mutation.
const ref = createAlertRef(createAlertVars);
// Variables can be defined inline as well.
const ref = createAlertRef({ zoneId: ..., alertType: ..., message: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAlertRef(dataConnect, createAlertVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.alert_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.alert_insert);
});
```

