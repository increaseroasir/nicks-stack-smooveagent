export const id = "05-channel-label";
export const oldString = "children:r===\"offline\"?\"CHECKING SESSION\":\"VERIFIED\"";
export const newString = "children:rr?\"RETRY CONNECTION\":c===\"live\"&&we.current?.readyState===WebSocket.OPEN?\"VERIFIED\":c===\"connecting\"?\"CHECKING SESSION\":\"OFFLINE\"";
