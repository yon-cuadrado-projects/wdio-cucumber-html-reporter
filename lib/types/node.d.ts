import { Browser } from 'webdriverio';
import { cjson_metadata } from '../models';
export { };

declare global {
    namespace NodeJS {
        export interface EnvironmentVariables {
            wdioCucumberHtmlReporter: string;
            attachment: string;
        }

        export interface Global {
            browser: Browser<'sync'>;
        }
    }

    namespace WebDriver {
        export interface W3CCapabilities {
            cjson_metadata: cjson_metadata;
        }
    }
}
