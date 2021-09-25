import { ErrorMessage, Step } from './models';
import { HookStats, TestStats } from '@wdio/reporter';
import { FAILED } from './constants';

import stripAnsi from 'strip-ansi';



/**
 * Add a failed message
 *
 * @param {object}  testObject
 *
 * @return {object}
 */
export const getFailedMessage = ( testObject: TestStats | HookStats ): ErrorMessage => {
    if ( testObject.state === FAILED ) {
        return {
            error_message: stripAnsi( testObject.error.stack ),
        };
    }

    return {};
};


