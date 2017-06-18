import * as ReactGA from "react-ga"
import { IStore } from "../../redux/modules/interfaces"

// FIXME Where should config props like API keys live?
ReactGA.initialize("UA-100057077-1")

class GATracker {
    verbose: boolean
    always_send: boolean

    constructor(verbose: boolean = false, always_send: boolean = false) {
        this.verbose = verbose
        this.always_send = always_send
    }

    pageview(path: string) {
        if (DEVELOPMENT === false || this.always_send === true) {
            ReactGA.set({ page: path })
            ReactGA.pageview(path)
        }

        if (this.verbose === true) {
            console.log("GATracker:pageview", path)
        }
    }

    event(cfg: object) {
        if (DEVELOPMENT === false || this.always_send === true) {
            ReactGA.event(cfg)
        }

        if (this.verbose === true) {
            console.log("GATracker:event", cfg)
        }
    }
}

const gaTrack = new GATracker()

const AnalyticsMiddleware = (store: IStore) => (next: Function) => (action: any) => {
    if ("meta" in action && "analytics" in action.meta) {
        gaTrack.event(Object.assign(action.meta.analytics, { type: action.type }))
    }

    let result = next(action)
    return result
}

const fireAnalyticsTracking = () => {
    gaTrack.pageview(window.location.pathname + window.location.search)
}

interface IAnalyticsMeta {
    category: string
    type?: string
    payload?: {
        [key: string]: any
    }
}

export { AnalyticsMiddleware, fireAnalyticsTracking, IAnalyticsMeta }
