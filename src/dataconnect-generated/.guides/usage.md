# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listAllEvents, getEventDetails, createAlert, getMyZoneTelemetry } from '@dataconnect/generated';


// Operation ListAllEvents: 
const { data } = await ListAllEvents(dataConnect);

// Operation GetEventDetails:  For variables, look at type GetEventDetailsVars in ../index.d.ts
const { data } = await GetEventDetails(dataConnect, getEventDetailsVars);

// Operation CreateAlert:  For variables, look at type CreateAlertVars in ../index.d.ts
const { data } = await CreateAlert(dataConnect, createAlertVars);

// Operation GetMyZoneTelemetry:  For variables, look at type GetMyZoneTelemetryVars in ../index.d.ts
const { data } = await GetMyZoneTelemetry(dataConnect, getMyZoneTelemetryVars);


```