import {NgModule} from '@angular/core';
import {APOLLO_OPTIONS} from 'apollo-angular';
import {ApolloClientOptions, InMemoryCache, ApolloLink} from '@apollo/client/core';
import {HttpLink} from 'apollo-angular/http';
import {HttpHeaders} from '@angular/common/http';

const uri = 'https://us-east-1.aws.realm.mongodb.com/api/client/v2.0/app/clintrialgql-evbee/graphql'; // <-- add the URL of the GraphQL server here
export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
  // based on example from https://apollo-angular.com/docs/data/network#middleware
  const http = httpLink.create({uri});
  const middleware = new ApolloLink((operation, forward) => {
    operation.setContext({
      headers: new HttpHeaders()
        .set("email", "demo@gmail.com")
        .set("password", "Passw0rd")
    });
    return forward(operation);
  });
  const link = middleware.concat(http);
  return {
    link,
    cache: new InMemoryCache(),
  };
}

@NgModule({
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
