# MongoRx

## What it is

This application demonstrates how MongoDB Atlas, Atlas Search, Atlas Vector Search, Atlas Charts and Realm, combined with cloud ecosystem services like Google Maps and Google Geocoding can be used to build a data discovery and exploration application.

The application visualizes two datasets -- one from [ClinicalTrials.gov](https://clinicaltrials.gov/) and another from [OpenFDA](https://open.fda.gov) -- to create a unique information discovery experience that was not possible using the existing search UI offered by these respective websites.

## Installation

1. ```bash
   git clone https://github.com/mongodb-developer/MongoRx.git
   ```

1. Create Angular environment files from template
   ```bash
   cd src/environments
   cp environment.prod.ts.sample environment.prod.ts
   cp environment.ts.sample environment.ts
   ```

1. [Create an API key for Google Maps](https://developers.google.com/maps/documentation/javascript/get-api-key).

1. Edit `environment.prod.ts` and `environment.ts` and update the `googleMapsApiKey` property with your new API key.

1. Create a config file from template
   ```bash
   cd MongoRx/deploy
   cp env.config.sample env.config
   ```

1. Edit `env.config` and provide your [MongoDB Atlas API public and private keys](https://docs.atlas.mongodb.com/configure-api-access/), your Atlas project ID, Atlas cluster name, and the [connection string for your Atlas cluster](https://docs.atlas.mongodb.com/connect-to-database-deployment/).

1. Execute the setup script -- _**note:**_ this is a long-running script that may take upwards of an hour to complete!
   ```bash
   ./setup.sh
   ```

## Running the Application

To run the app locally in development mode:
```bash
cd MongoRx
npm start
```

To run the app locally in production mode:
```bash
cd MongoRx
ng serve --browser-target project:target:production
```

Navigate to http://localhost:4200