import {Injectable, Output, EventEmitter} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import {Subject} from 'rxjs/Subject';
import {environment} from '../environments/environment';

@Injectable()
export class HttpService {
    private serverApi = '';
    private Info = new Subject<any>();
    private infoObj: any;

    constructor(protected http: HttpClient, private router: Router) {
        if (!environment.production) {
            this.serverApi = 'http://localhost:8008';
        }
        const self = this;


        function getTimeOut() {
            setTimeout(function () {
                self.http.get(self.serverApi + '/get_info').toPromise()
                    .then(response => {
                        self.infoObj = response;
                        self.Info.next(self.infoObj);
                        if (router.url === '/server-error') {
                            router.navigate(['/']);
                        }
                        getTimeOut();
                    })
                    .catch(() => {
                        router.navigate(['/server-error']);
                        getTimeOut();
                    })
            }, 6000);
        }

        getTimeOut();
    }

    subscribeInfo() {
        return this.Info.asObservable();
    }

    getInfo(): Observable<Response> {
        if (this.infoObj === undefined) {
            const URL = `${this.serverApi}/get_info`;
            return this.http.get(URL).map(response => {
                this.infoObj = response;
                return this.infoObj;
            });
        } else {
            return this.infoObj;
        }
    }

    getInfoAPI(flag): Observable<Object> {
            const URL = `${this.serverApi}/api/get_info/`+flag;
            return this.http.get(URL).map(response => {
                return response;
            });
    }

    // BlockChain Page
    public getTxPoolDetails(limit: number) {
        const URL = `${this.serverApi}/get_tx_pool_details/` + limit;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }

    public getBlockDetails(start: number, limit: number) {
        const URL = `${this.serverApi}/get_blocks_details/` + start + '/' + limit;
        return this.http.get(URL)
    }

    public getBlockDetailsApi(start: number, limit: number) {
        const URL = `${this.serverApi}/api/get_blocks_details/` + start + '/' + limit;
        return this.http.get(URL)
    }

    public getMainBlockDetails(id: any) {
        const URL = `${this.serverApi}/get_main_block_details/`+id;
        return this.http.get(URL).map(response => response);
    }

    public getMainBlockDetailsApi(id: any) {
        const URL = `${this.serverApi}/api/get_main_block_details/` + id;
        return this.http.get(URL).map(response => response);
    }



    // Alt-blocks Page
    public getAltBlocks(offset: number, count: number) {
        const URL = `${this.serverApi}/get_alt_blocks_details/` + offset + '/' + count;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }
    public getAltBlocksFromJson() {
        return this.http.get('./assets/json/altblocks.json').map((response) => {
            return response;
        });
    }
    public getAltDetailBlock(id: any) {
        const URL = `${this.serverApi}/get_alt_block_details/` + id;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }

    public getPoolTxsDetailsJson() {
        return this.http.get('./assets/json/pooltx_details.json').map((response) => {
            return response;
        });
    }
    public getAllPoolTxListJson() {
        return this.http.get('./assets/json/allpooltxList.json').map((response) => {
            return response;
        });
    }
    public getTxsDetailsJson() {
        return this.http.get('./assets/json/txdetails.json').map((response) => {
            return response;
        });
    }
    public getTotalSupply() {
        const URL = `${this.serverApi}/api/total_supply`;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }
    public getCurrentSupply() {
        const URL = `${this.serverApi}/api/current_supply`;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }
    // Transaction Page
    public getTransaction(tx_hash: any) {
        const URL = `${this.serverApi}/get_tx_details/` + tx_hash;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }

    public getConnectTransaction(amount, i) {
        const URL = `${this.serverApi}/get_out_info/` + amount + '/' + i;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }

    // Aliases Page
    public getAliases(offset: number, count: number, search: any) {
        if (!search) search = 'all'
        const URL = `${this.serverApi}/get_aliases/` + offset + '/' + count + '/' + search;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }

    public searchById(search: any) {
        const URL = `${this.serverApi}/search_by_id/` + search;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }
    public getChart(chart: any, period: any) {
        const URL = `${this.serverApi}/get_chart/` + chart + '/' + period;
        return this.http.get(URL).map((response) => {
            return response;
        });
    }
}


// MainInfo resolve
@Injectable()
export class ServiceResolver implements Resolve<any> {
    constructor(private service: HttpService) {
    }

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        return this.service.getInfo();
    }
}

// AltBlock resolve
@Injectable()
export class ResolveAltBlock implements Resolve<any> {
    constructor(private service: HttpService) {
    }

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> | Promise<any> | any {
        const id: any = route.params['id'];
        return this.service.getAltDetailBlock(id);
    }
}

@Injectable()
export class MobileNavState {
    navIsOpen = true;
    @Output() change: EventEmitter<boolean> = new EventEmitter();

    toggleMenu() {
        this.navIsOpen = this.navIsOpen !== true;
        this.change.emit(this.navIsOpen);
    }
}
