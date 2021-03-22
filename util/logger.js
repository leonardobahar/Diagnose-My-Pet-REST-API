module.exports = function () {
    let originalConsoleLog = console.log;
    let originalErrorLog = console.error;
    let originalInfoLog = console.info;
    // Overwriting
    console.log = function () {
        var args = [].slice.call(arguments);
        originalConsoleLog.apply(console.log,[getCurrentDateString()].concat(args));
    };

    console.error = function () {
        var args = [].slice.call(arguments);
        originalErrorLog.apply(console.error,[getCurrentDateString()].concat(args));
    };

    console.info = function () {
        var args = [].slice.call(arguments);
        originalInfoLog.apply(console.info,[getCurrentDateString()].concat(args));
    };

    // Returns current timestamp
    function getCurrentDateString() {
        return (new Date()).toISOString() + ' ::';
    };
}
