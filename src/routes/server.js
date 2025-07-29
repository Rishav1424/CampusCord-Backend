import { Router } from "express";
import {
  listServers,
  getMyServers,
  serverDetails,
  createServer,
  editServer,
  deleteServer,
} from "../controllers/server.js";
import {
  getMembers,
  joinServer,
  leaveServer,
  promoteMember,
  demoteMember,
} from "../controllers/members.js";
import {
  getChannelsList,
  getChannelDetails,
  createChannel,
  editChannel,
  deleteChannel,
  createMessage,
  deleteMessage,
  likeMessage,
  disLikeMessage,
  joinRoom,
} from "../controllers/channels.js";
import {
  authorizeMember,
  authorizeAdmin,
} from "../middleware/authentication.js";

export const serverRoutes = Router();

serverRoutes.route("/").get(listServers).post(createServer);
serverRoutes.get("/my", getMyServers);

serverRoutes.post("/:serverId/join", joinServer);

const authorizedServerRoutes = new Router({ mergeParams: true });

authorizedServerRoutes
  .route("/")
  .get(serverDetails)
  .patch(authorizeAdmin, editServer)
  .delete(authorizeAdmin, deleteServer);
authorizedServerRoutes.get("/members", getMembers);
authorizedServerRoutes.delete("/leave", leaveServer);
authorizedServerRoutes.patch("/promote/:userId", authorizeAdmin, promoteMember);
authorizedServerRoutes.patch("/demote/:userId", authorizeAdmin, demoteMember);

authorizedServerRoutes
  .route("/channel")
  .get(getChannelsList)
  .post(authorizeAdmin, createChannel);

authorizedServerRoutes
  .route("/channel/:channelName")
  .get(getChannelDetails)
  .patch(authorizeAdmin, editChannel)
  .delete(authorizeAdmin, deleteChannel);

authorizedServerRoutes.route("/channel/:channelName/joinroom").post(joinRoom);
authorizedServerRoutes.route("/channel/:channelName/message").post(createMessage);
authorizedServerRoutes.route("/channel/:channelName/message/:messageId").delete(deleteMessage);
authorizedServerRoutes.route("/channel/:channelName/message/:messageId/like").post(likeMessage);
authorizedServerRoutes.route("/channel/:channelName/message/:messageId/dislike").delete(disLikeMessage);


serverRoutes.use("/:serverId", authorizeMember, authorizedServerRoutes);

export default serverRoutes;
