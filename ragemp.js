import { createSocket } from "node:dgram";
import { createServer, connect } from "node:net";
import { appendFile } from "node:fs/promises";
import createDebug from "debug";

// some debugs...
const remoteUdpServerDebug = createDebug("remote-udp");
const localUdpServerDebug = createDebug("local-udp");
const remoteTcpServerDebug = createDebug("remote-tcp");
const localTcpServerDebug = createDebug("local-tcp");

const TARGET_IP = ""; // to be completed with the actually remote ip.
const TARGET_UDP_PORT = 22005;
const TARGET_TCP_PORT = 22006;

const logIntoFileWithNamespace = (nameSpace, content) => {
  appendFile("./log.txt", `[${nameSpace}]: ${content}\n`);
};

const udpProxy = createSocket("udp4");

/**
 * @type {import("node:dgram").RemoteInfo}
 */
let udpClientRemoteInfo;

const udpServer = createSocket("udp4");
const tcpServer = createServer();

udpServer
  .on("message", (payload, rInfo) => {
    udpClientRemoteInfo = rInfo;

    localUdpServerDebug("%d bytes received and sent", payload.length);

    logIntoFileWithNamespace(
      "local-udp",
      JSON.stringify(payload.toJSON().data)
    );

    udpProxy.send(payload, TARGET_UDP_PORT, TARGET_IP);
  })
  .bind(TARGET_UDP_PORT);

tcpServer
  .on("connection", (socket) => {
    const tcpProxy = connect({
      host: TARGET_IP,
      port: TARGET_TCP_PORT,
    });

    tcpProxy.on("data", (data) => {
      remoteTcpServerDebug("%d bytes received and sent", data.length);

      socket.write(data);
    });

    socket.on("data", (data) => {
      localTcpServerDebug("%d bytes received and sent", data.length);

      tcpProxy.write(data);
    });
  })
  .on("listening", () => {
    localTcpServerDebug("listening on port %d", TARGET_TCP_PORT);
  })
  .listen(TARGET_TCP_PORT);

udpProxy.on("message", (payload) => {
  remoteUdpServerDebug("%d bytes received and sent", payload.length);

  logIntoFileWithNamespace("remote-udp", JSON.stringify(payload.toJSON().data));

  udpServer.send(
    payload,
    udpClientRemoteInfo.port,
    udpClientRemoteInfo.address
  );
});
