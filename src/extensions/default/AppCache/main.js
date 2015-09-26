
/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var Dialogs                     = brackets.getModule('widgets/Dialogs'),
        DefaultDialogs              = brackets.getModule('widgets/DefaultDialogs'),
        Strings                     = brackets.getModule('strings');

    var appCache = window.applicationCache;

    function handleCacheEvent(e) {
      if (e.type === 'updateready') {
        showDialog();
      }
    }

    function showDialog() {
        var dlg = Dialogs.showModalDialog(
            DefaultDialogs.DIALOG_ID_INFO,
            'Updates Ready',
            'Would you like to reload brackets now?',
            [
                {
                    className : Dialogs.DIALOG_BTN_CLASS_NORMAL,
                    id        : Dialogs.DIALOG_BTN_CANCEL,
                    text      : Strings.CANCEL
                },
                {
                    className : Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                    id        : Dialogs.DIALOG_BTN_OK,
                    text      : 'DO IT!'
                }
            ],
            false
        );
        var $dlg = dlg.getElement();
        $dlg.one("buttonClick", function (e, buttonId) {
            if (buttonId === Dialogs.DIALOG_BTN_OK) {
                window.location.reload();
            } else {
                dlg.close();
            }
        });
    }

    function initAppCacheListeners() {
        // May have missed the update event
        if (appCache.status === appCache.UPDATEREADY) {
            showDialog();
        } else {
            // Havent missed it, listen for it
            appCache.addEventListener('updateready', handleCacheEvent, false);
        }
    }

    initAppCacheListeners();

});
