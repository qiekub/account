export function utilTriggerEvent(target, type) {
    target.each(function() {
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent(type, true, true);
        this.dispatchEvent(evt);
    });
}
