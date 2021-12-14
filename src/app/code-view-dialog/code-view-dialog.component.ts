import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import * as Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';

export interface DialogData {
  gqlQuery: any;
  gqlQueryLang: string;
  gqlQueryTitle: string;
  gqlVars: any;
  gqlVarsTitle: string;
  gqlVarsLang: string;
}

/**
 * @title Dialog Overview
 */
@Component({
  selector: 'code-view-dialog-component',
  templateUrl: 'code-view-dialog.component.html',
  styleUrls: ['code-view-dialog.component.css'],
})
export class CodeViewDialogComponent {
  constructor() {}

}

@Component({
  selector: 'code-view-dialog',
  templateUrl: 'code-view-dialog.html',
  styleUrls: ['./code-view-dialog.component.css']

})

export class CodeViewDialog {
  dialogData: DialogData;

  constructor(
    public dialogRef: MatDialogRef<CodeViewDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {
      this.dialogData = {
        gqlQuery: Prism.highlight(data.gqlQuery, data.gqlQueryLang ? Prism.languages[data.gqlQueryLang] : Prism.languages.graphql, data.gqlQueryLang || "graphql"),
        gqlQueryLang: data.gqlQueryLang,
        gqlQueryTitle: data.gqlQueryTitle || "Generic Code",
        gqlVars: Prism.highlight(data.gqlVars, data.gqlVarsLang ? Prism.languages[data.gqlVarsLang] : Prism.languages.json, data.gqlVarsLang || "json"),
        gqlVarsLang: data.gqlVarsLang,
        gqlVarsTitle: data.gqlVarsTitle || "Generic Code"
      }
    }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
