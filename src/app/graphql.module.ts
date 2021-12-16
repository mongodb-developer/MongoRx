import {NgModule} from '@angular/core';
import {APOLLO_OPTIONS} from 'apollo-angular';
import {ApolloClientOptions, InMemoryCache, ApolloLink} from '@apollo/client/core';
import {HttpLink} from 'apollo-angular/http';
import {HttpClient, HttpHeaders, HttpXhrBackend} from '@angular/common/http';

const login: string = 'https://us-east-1.aws.realm.mongodb.com/api/client/v2.0/app/clintrialgql-vfmul/auth/providers/local-userpass/login';
const uri = 'https://us-east-1.aws.realm.mongodb.com/api/client/v2.0/app/clintrialgql-vfmul/graphql'; // <-- add the URL of the GraphQL server here
export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
  // get OAuth token
  const httpClient = new HttpClient(new HttpXhrBackend({ build: () => new XMLHttpRequest() }));
  let accessToken: string, refreshToken: string;
  let response: any;

  httpClient.post(login, {
      "username": "demo@gmail.com",
      "password": "Passw0rd"
  }).subscribe(data => {
    response = data;
  });

  // based on example from https://apollo-angular.com/docs/data/network#middleware
  const http = httpLink.create({uri});
  const middleware = new ApolloLink((operation, forward) => {
    operation.setContext({
      headers: new HttpHeaders()
        //.set("email", "demo@gmail.com")
        //.set("password", "Passw0rd")
        .set("authorization", "Bearer " + response.access_token)
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
export class GraphQLModule {
  constructor(private http: HttpClient) {}
}
