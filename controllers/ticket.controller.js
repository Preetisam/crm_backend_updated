const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");
const constants = require("../utils/constants");
const sendEmail = require('../utils/NotificationClient');

exports.createTicket = async (req, res) => {
  const ticketObject = {
    title: req.body.title,
    ticketPriority: req.body.ticketPriority,
    description: req.body.description,
    status: req.body.status,
    reporter: req.userId // This is coming from authJwt middleware
  };

  try {
    // Assign an engineer to the ticket which is in the Approved state
    const engineer = await User.findOne({
      userType: constants.userTypes.engineer,
      userStatus: constants.userStatus.approved
    });

    if (engineer) {
      ticketObject.assignee = engineer._id;
    }

    const ticket = await Ticket.create(ticketObject);

    if (ticket) {
      // Update the customer
      const user = await User.findOne({
        _id: req.userId
      });

      user.ticketsCreated.push(ticket._id);
      await user.save();

      // Update the engineer
      if (engineer) {
        engineer.ticketsAssigned.push(ticket._id);
        await engineer.save();
      }

      // Send email notification
      sendEmail(
        ticket._id,
        `Ticket with ticketId ${ticket._id} updated and is in status ${ticket.status}`,
        ticket.description,
        [user.email, engineer.email],
        ticket.reporter
      );

      return res.status(200).send(ticket);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Some internal server error occurred"
    });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id });

    if (ticket && ticket.reporter.toString() === req.userId) {
      // Allowed to update
      ticket.title = req.body.title !== undefined ? req.body.title : ticket.title;
      ticket.description = req.body.description !== undefined ? req.body.description : ticket.description;
      ticket.ticketPriority = req.body.ticketPriority !== undefined ? req.body.ticketPriority : ticket.ticketPriority;
      ticket.status = req.body.status !== undefined ? req.body.status : ticket.status;

      const updatedTicket = await ticket.save();

      return res.status(200).send(updatedTicket);
    } else if (ticket && ticket.assignee.toString() === req.userId) {
      // Allowed to update
      ticket.title = req.body.title !== undefined ? req.body.title : ticket.title;
      ticket.description = req.body.description !== undefined ? req.body.description : ticket.description;
      ticket.ticketPriority = req.body.ticketPriority !== undefined ? req.body.ticketPriority : ticket.ticketPriority;
      ticket.status = req.body.status !== undefined ? req.body.status : ticket.status;

      const updatedTicket = await ticket.save();

      return res.status(200).send(updatedTicket);
    } else {
      const userData = await User.findOne({ _id: req.userId });

      if (userData.userType === constants.userTypes.admin) {
        ticket.title = req.body.title !== undefined ? req.body.title : ticket.title;
        ticket.description = req.body.description !== undefined ? req.body.description : ticket.description;
        ticket.ticketPriority = req.body.ticketPriority !== undefined ? req.body.ticketPriority : ticket.ticketPriority;
        ticket.status = req.body.status !== undefined ? req.body.status : ticket.status;

        const updatedTicket = await ticket.save();

        return res.status(200).send(updatedTicket);
      } else {
        return res.status(401).send({
          message: "Ticket can only be updated by the customer who created it"
        });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal error"
    });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    let tickets;

    if (user.userType === constants.userTypes.customer) {
      tickets = await Ticket.find({ _id: { $in: user.ticketsCreated } });
    } else if (user.userType === constants.userTypes.engineer) {
      tickets = await Ticket.find({ assignee: req.userId });
    } else if (user.userType === constants.userTypes.admin) {
      tickets = await Ticket.find({});
    } else {
      return res.status(200).send("Your User Type is Not Correct");
    }

    if (tickets.length) {
      return res.status(200).send(tickets);
    } else {
      return res.status(200).send("No tickets found");
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error");
  }
};

exports.getOneTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (ticket) {
      if (ticket.assignee.toString() === req.userId || ticket.reporter.toString() === req.userId) {
        return res.status(200).send(ticket);
      } else {
        const user = await User.findOne({ _id: req.userId });

        if (user.userType === constants.userTypes.admin) {
          return res.status(200).send(ticket);
        } else {
          return res.status(401).send("You are not authorized to access this ticket");
        }
      }
    } else {
      return res.status(200).send("Ticket not found");
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error");
  }
};

exports.assigneeEngineer = async (req, res) => {
  const ticketId = req.body.ticketId;
  const engineerId = req.body.engineerId;

  try {
    const ticket = await Ticket.findById(ticketId);
    const engineer = await User.findById(engineerId);

    if (ticket && ticket.assignee.length === 0 && engineer && engineer.userStatus === constants.userStatus.approved) {
      ticket.assignee = engineerId;
      engineer.ticketsAssigned.push(ticketId);
      await ticket.save();
      await engineer.save();
      return res.status(200).send(`Ticket (ID: ${ticketId}) assigned to engineer (ID: ${engineerId})`);
    } else if (!ticket) {
      return res.status(200).send("Ticket ID is incorrect");
    } else if (ticket.assignee.length) {
      return res.status(200).send("Ticket already assigned to an engineer");
    } else if (engineer && engineer.userStatus !== constants.userStatus.approved) {
      return res.status(200).send("Engineer is not approved");
    } else {
      return res.status(200).send("Engineer ID is incorrect");
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error");
  }
};
