import { Component, OnInit } from '@angular/core';
import {HttpService} from '../http.service';

@Component({
  selector: 'app-api',
  templateUrl: './api.component.html',
  styleUrls: ['./api.component.scss']
})
export class ApiComponent implements OnInit {
  getInfo: any;

  constructor(public service: HttpService) { }
  ngOnInit() {
    this.service.getInfo(4294967295).subscribe(data => {
      this.getInfo = data;
    })
  }

}
