import { Hocuspocus } from "@hocuspocus/server";

import middleware from "./middleware.js";
import * as Y from "yjs";

// Prisma
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

// Fix bigint issue
BigInt.prototype.toJSON = function () {
  return this.toString(); // Simply converts bigints to strings
};

prisma.$connect().then(() => {
  console.log("Prisma connected");
});

// Configure the server …
const server = new Hocuspocus({
  port: 8090,
  address: "0.0.0.0",
  onAuthenticate: async (data) => {
    const { token, documentName } = data;
    console.log("onAuthenticate", token, documentName)

    // Check if token is valid
    const decodedToken = await middleware.verifyToken(token);
    console.log("decodedToken", decodedToken)
    if (!decodedToken) {
      throw new Error("Unauthorized - Token verification failed");
    }

    // Get document type and id from name
    const documentType = documentName.split(".")[0];
    const documentId = documentName.split(".")[1];

    console.log("documentName", documentName)
    console.log("documentType", documentType)
    console.log("documentId", documentId)

    // Check if user has access to document
    let document;
    if (documentType === "documents") {
      console.log("documentName", documentId)
      document = await prisma.document.findFirst({
        where: { id: documentId },
      });
    } else if (documentType === "assignments") {
      document = await prisma.assignment.findFirst({
        where: { id: documentId },
      });
    } else if (documentType === "assignmentAnswers") {
      document = await prisma.assignment_answer.findFirst({
        where: { id: documentId },
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: decodedToken.sub },
    });

    if (!document) {
      throw new Error("Unauthorized - Document not found");
    }

    if (!user) {
      throw new Error("Unauthorized - User not found");
    }

    if (documentType === "documents") {
      if (
        !await prisma.file_permission.findFirst({
          where: { document_id: document.id, user_id: user.id },
        })
      ) {
        throw new Error("Unauthorized - User does not have access to document");
      }
    } else if (documentType === "assignmentAnswers") {
      if (document.student_id !== user.id) {
        throw new Error("Unauthorized - User does not have access to document");
      }
    } else if (documentType === "assignments") {
      if (document.teacher_id !== user.id) {
        throw new Error("Unauthorized - User does not have access to document");
      }
    }

    // Return user id
    data.context["user"] = user;
    return {
      user: user,
    };
  },
  onLoadDocument: async (data) => {
    const { documentName } = data;

    // Get document type and id from name
    const documentType = documentName.split(".")[0];
    const documentId = documentName.split(".")[1];

    // Set `document` based on document type
    let document;
    if (documentType === "documents") {
      document = prisma.document;
    } else if (documentType === "assignments") {
      document = prisma.assignment;
    } else if (documentType === "assignmentAnswers") {
      document = prisma.assignment_answer;
    }

    document
      .findFirst({ where: { id: documentId } })
      .then((document) => {
        if (!document) {
          return data.document;
        }
        Y.applyUpdate(data.document, new Uint8Array(document.data));
      })
      .catch(() => {
        return data.document;
      });
  },
  onStoreDocument: async (data) => {
    const { documentName } = data;

    // Get document type and id from name
    const documentType = documentName.split(".")[0];
    const documentId = documentName.split(".")[1];

    // Set `document` based on document type
    let document;
    if (documentType === "documents") {
      document = prisma.document;
    } else if (documentType === "assignments") {
      document = prisma.assignment;
    } else if (documentType === "assignmentAnswers") {
      document = prisma.assignment_answer;
    }

    document
      .update({
        where: { id: documentId },
        data: { data: Buffer.from(Y.encodeStateAsUpdate(data.document)) },
      })
      .catch((err) => {
        throw new Error(err);
      });
  },
});

// … and run it!
server.listen();
