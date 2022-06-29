# Cloud-Native Sustainability

This repository includes a Node.js package to manage a `SustainableApplicationModel`.

## Getting Started

The package can be installed by using [npm](https://www.npmjs.com) to install the package from GitHub:

`npm install git+https://github.com/valentinbootz/cloud-native-sustainability.git`

This includes the dependency in the `package.json` of the project:

```json
  "dependencies": {
    "cloud-native-sustainability": "git+https://github.com/valentinbootz/cloud-native-sustainability.git",
  }
```

The package exports the `SustainableApplicationModel` class to be imported in the project:

`import { SustainableApplicationModel } from 'cloud-native-sustainability';`

## Sustainable Application Model

The `SustainableApplicationModel` class can be initialized with a xml:

`let model = new SustainableApplicationModel(xml);`

The get functions for the `feeedback` and `metadata` properties of the `SustainableApplicationModel` return async functions:

```
const {
  overall,
  services
} = await model.feedback;
```

The sustainability feedback describes the `SustainableApplicationModel` with sustainability scores and information for the services:

```json
{
    "overall": {
        "sustainability awareness": 20,
        "microservice classification": 40,
        "microservice enrichment": 20
    },
    "services": {
        "flight-search": {
            "modalities": {
                "lowPower": {
                    "requirements": {
                        "responseTime": 1,
                        "instanceType": "small"
                    }
                }
            },
            "optional": false
        },
        ...
    }
}
```

The `SustainableApplicationModel` can be updated with services by using the `async update(services, merge = false)` function:

```json
[
    {
        "id": "flight-search",
        "name": "Flight Search",
        "modalities": {
            "highPerformance": {
                "id": "0.0.0.0.1.0",
                "name": "RecommendationFlightSearch",
                "description": "The information in the customer profile is used to suggest routes or rank the results. This variation improves the customer experience but increases the computational cost of the service.",
                "requirements": {
                    "responseTime": 100,
                    "instanceType": "large"
                }
            },
            ...
        }
    },
    ...
]
```



