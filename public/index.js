const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
const connection = new BareMux.BareMuxConnection('/baremux/worker.js');
connection.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl }]);