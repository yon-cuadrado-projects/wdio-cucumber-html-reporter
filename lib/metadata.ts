import { DesiredCapabilitiesExtended, RunnerStatsExtended, W3CCapabilitiesExtended, WebdriverIOExtended } from './types/wdio';
import { Browser } from 'webdriverio';
import { Models } from 'cucumber-html-report-generator';
import { NOT_KNOWN } from './constants';
import WebDriver from 'webdriver';
import { cjson_metadata } from './models';

export class Metadata {
    public determineMetadata ( data: RunnerStatsExtended ): Models.Metadata[] {
        const featureMetadata = <Models.Metadata[]>[];
        const currentCapabilities = data.capabilities as W3CCapabilitiesExtended;
        let w3cCaps = ( < W3CCapabilitiesExtended | DesiredCapabilitiesExtended>( data.config.capabilities ) )?.['cjson:metadata'];
        const currentConfigCapabilities = data.capabilities as DesiredCapabilitiesExtended;
        const metadataFromWdioConfiguration: cjson_metadata = currentConfigCapabilities?.['cjson:metadata'];

        if( typeof browser !== 'undefined' ){
            w3cCaps = w3cCaps ?? ( ( browser as Browser<'async'> ).options as WebdriverIOExtended )?.requestedCapabilities?.['cjson:metadata'];
            const optsCaps = browser.options.capabilities;
            const browserMetadata = metadataFromWdioConfiguration ?? ( optsCaps as DesiredCapabilitiesExtended )?.['cjson:metadata'] ?? w3cCaps;
            const instanceBrowserData = this.determineBrowserData( currentCapabilities, currentConfigCapabilities, browserMetadata );
            featureMetadata.push( instanceBrowserData );
        } else{
            const instanceAppData = this.determineAppData( currentConfigCapabilities, metadataFromWdioConfiguration );
            featureMetadata.push( instanceAppData );
        }

        const device = this.determineDeviceName( metadataFromWdioConfiguration, currentConfigCapabilities );
        const platform = {
            name: this.determinePlatformName( metadataFromWdioConfiguration, currentCapabilities ),
            version: this.determinePlatformVersion( metadataFromWdioConfiguration ),
        };

        featureMetadata.push( <Models.Metadata>{ name: 'device', value: device } );
        featureMetadata.push( <Models.Metadata>{ name: 'platform', value: `${platform.name} ${platform.version}` } );

        return featureMetadata;
    }

    public determineDeviceName ( metadata: cjson_metadata, currentConfigCapabilities: WebDriver.DesiredCapabilities ): string {
        return ( metadata?.device || currentConfigCapabilities.deviceName || `Device name ${NOT_KNOWN}` );
    }

    public determinePlatformName ( metadata: cjson_metadata, currentCapabilities: WebDriver.DesiredCapabilities ): string {
        const currentPlatformName = currentCapabilities.platformName
            ? currentCapabilities.platformName.includes( 'mac' )
                ? 'osx'
                : currentCapabilities.platformName.includes( 'windows' )
                    ? 'windows'
                    : currentCapabilities.platformName
            : `Platform name ${NOT_KNOWN}`;
        return metadata?.platform?.name ?? currentPlatformName;
    }

    public determinePlatformVersion ( metadata: cjson_metadata ): string {
        return metadata?.platform?.version ?? `Version ${NOT_KNOWN}`;
    }

    public determineAppData ( currentConfigCapabilities: DesiredCapabilitiesExtended, metadata: cjson_metadata ): Models.Metadata {
        const metaAppName: string = metadata?.app?.name ?? 'No metadata.app.name available';
        const metaAppVersion: string = metadata?.app?.version ?? 'No metadata.app.version available';
        const appPath = currentConfigCapabilities.app || currentConfigCapabilities.testobject_app_id || metaAppName;
        const appName = appPath.substring( appPath.replace( '\\', '/' ).lastIndexOf( '/' ) ).replace( '/', '' );

        return {
            name: 'app', value: `${appName} ${metaAppVersion}`
        };
    }

    public determineBrowserData ( currentCapabilities: WebDriver.DesiredCapabilities, currentConfigCapabilities: WebDriver.DesiredCapabilities, metadata: cjson_metadata ): Models.Metadata {
        const browserName = currentCapabilities.browserName
            || currentConfigCapabilities.browserName
            || ( metadata?.browser?.name ?? 'No metadata.browser.name available' );
        const browserVersion = currentCapabilities.version
            || currentCapabilities.browserVersion
            || currentConfigCapabilities.browserVersion
            || ( metadata?.browser?.version ?? 'No metadata.browser.version available' );

        return{
            name: 'browser', value: `${browserName} ${browserVersion}`
        };
    }
}
