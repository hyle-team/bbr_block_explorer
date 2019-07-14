import {Component, OnDestroy, OnInit} from '@angular/core';
import {HttpService} from '../http.service';
import {Subscription} from 'rxjs/Subscription';

@Component({
  selector: 'app-api',
  templateUrl: './api.component.html',
  styleUrls: ['./api.component.scss']
})
export class ApiComponent implements OnInit, OnDestroy {
    getInfo: any;
    blockdetails: any;
    altblockdetails: any;
    pooltxsdetails: any;
    allpooltxList: any;
    txdetails: any
    subscription1: Subscription;
    subscription2: Subscription;
    subscription3: Subscription;
    subscription4: Subscription;
    subscription5: Subscription;
    subscription6: Subscription;
  constructor(public service: HttpService) {
      this.subscription1 = service.getInfo(4294967295).subscribe(data => {
          this.getInfo = data;
      })
      this.subscription2 = this.service.getBlockDetailsApi(15, 2).subscribe(data => {
          this.blockdetails = data;
      })
      this.subscription3 = this.service.getAltBlocksFromJson().subscribe(data => {
          this.altblockdetails = data;
      })
      this.subscription4 = this.service.getPoolTxsDetailsJson().subscribe(data => {
          this.pooltxsdetails = data;
      })
      this.subscription5 = this.service.getAllPoolTxListJson().subscribe(data => {
          this.allpooltxList = data;
      })
      this.subscription6 = this.service.getTxsDetailsJson().subscribe(data => {
          this.txdetails = data;
      })

  }
  ngOnInit() {
  }

    ngOnDestroy() {
        if (this.subscription1) { this.subscription1.unsubscribe(); }
        if (this.subscription2) { this.subscription2.unsubscribe(); }
        if (this.subscription3) { this.subscription3.unsubscribe(); }
    }
}
