const { validationResult } = require("express-validator");

const Inventory = require("../models/Inventory");
const Uploads = require("../models/update");
const utils = require("../helpers/utils");

exports.postAddUpdate = async (req, res, next) => {
  try {
    const name = req.body.name;
    const number = req.body.number;
    const case_quantity = req.body.case_quantity;
    const description = req.body.description;
    const qoh_case = req.body.qoh_case;
    const qoh_units = req.body.qoh_units;
    const case_weight = req.body.case_weight;
    const reorder_quantity = req.body.reorder_quantity;
    const length = req.body.length;
    const width = req.body.width;
    const height = req.body.height;
    const ship_ready = Boolean(req.body.ship_ready);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const newInventory = new Inventory({
      user: req.userId,
      name: name,
      number: number,
      case_quantity: case_quantity,
      description: description,
      qoh_case: qoh_case,
      qoh_units: qoh_units,
      case_weight: case_weight,
      reorder_quantity: reorder_quantity,
      length: length,
      width: width,
      height: height,
      ship_ready: ship_ready,
    });

    const inventory = await newInventory.save();

    res.status(201).json({
      state: 1,
      message: "created",
      data: inventory,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.editInventory = async (req, res, next) => {
  try {
    const id = req.body.id;
    const name = req.body.name;
    const number = req.body.number;
    const case_quantity = req.body.case_quantity;
    const description = req.body.description;
    const qoh_case = req.body.qoh_case;
    const qoh_units = req.body.qoh_units;
    const case_weight = req.body.case_weight;
    const reorder_quantity = req.body.reorder_quantity;
    const length = req.body.length;
    const width = req.body.width;
    const height = req.body.height;
    const ship_ready = Boolean(req.body.ship_ready);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const inventory = await Inventory.findById(id).populate({
      path: "user",
      select: "role",
      populate: {
        path: "role",
        model: "role",
      },
    });

    if (!inventory) {
      const error = new Error("inventory not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      inventory.user.role.name != "superadmin" &&
      inventory.user._id != req.userId &&
      inventory.temp
    ) {
      const error = new Error("not superaddmin or inventory creator");
      error.statusCode = 403;
      throw error;
    }

    inventory.name = name;
    inventory.number = number;
    inventory.case_quantity = case_quantity;
    inventory.description = description;
    inventory.qoh_case = qoh_case;
    inventory.qoh_units = qoh_units;
    inventory.case_weight = case_weight;
    inventory.reorder_quantity = reorder_quantity;
    inventory.length = length;
    inventory.width = width;
    inventory.height = height;
    inventory.ship_ready = ship_ready;

    const updateInventory = await inventory.save();

    res.status(201).json({
      state: 1,
      message: "created",
      data: updateInventory,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getAddUpdate = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const productPerPage = 10;
    const inventory = await Inventory.find({ user: req.userId })
      .skip((page - 1) * productPerPage)
      .limit(productPerPage);

    const total = await Inventory.find({ user: req.userId }).countDocuments();

    res.status(200).json({
      state: 1,
      message: `Inventory in page ${page}`,
      data: inventory,
      total: total,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const productPerPage = 10;

    let dataRangeStart = req.query.dataRangeStart || false;
    let dataRangeEnd = req.query.dataRangeEnd || false;

    let find = {};

    if (dataRangeStart && dataRangeEnd) {
      dataRangeStart = new Date(dataRangeStart);
      dataRangeEnd = new Date(dataRangeEnd);
      find = {
        $and: [
          { createdAt: { $gt: dataRangeStart } },
          { createdAt: { $lt: dataRangeEnd } },
        ],
        user: req.userId,
        kind: "inventory",
      };
    } else if (dataRangeStart && !dataRangeEnd) {
      dataRangeStart = new Date(dataRangeStart);

      find = {
        createdAt: { $gt: dataRangeStart },
        user: req.userId,
        kind: "inventory",
      };
    } else if (!dataRangeStart && dataRangeEnd) {
      dataRangeEnd = new Date(dataRangeEnd);

      find = {
        createdAt: { $lt: dataRangeEnd },
        user: req.userId,
        kind: "inventory",
      };
    } else if (!dataRangeStart && !dataRangeEnd) {
      find = {
        user: req.userId,
        kind: "inventory",
      };
    }

    const upload = await Uploads.find(find)
      .skip((page - 1) * productPerPage)
      .limit(productPerPage)
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "email username",
      });

    const total = await Uploads.find(find).countDocuments();

    res.status(200).json({
      state: 1,
      data: upload,
      total: total,
      message: `files in page ${page}`,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSingle = async (req, res, next) => {
  try {
    const id = req.params.id;

    let recipient = {};

    if (req.userRole == "superadmin" || req.userRole == "warehouse") {
      recipient = await Inventory.findById(id);
    } else {
      recipient = await Inventory.findOne({ user: req.userId, _id: id });
    }

    if (!recipient) {
      const error = new Error("Inventory not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      state: 1,
      message: `Inventory with id page ${id}`,
      data: recipient,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postUpload = async (req, res, next) => {
  try {
    const file = req.files;

    const e = validationResult(req);
    if (!e.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = e.array();
      throw error;
    }

    if (file.length == 0) {
      const error = new Error("please insert .csv file");
      error.statusCode = 422;
      throw error;
    }

    const newUpload = new Uploads({
      user: req.userId,
      filename: file[0].path,
      kind: "inventory",
    });

    const upload = await newUpload.save();

    const { errors, created, updated } = await utils.parse_inventory_upload(
      file[0].path,
      req.userId
    );

    res.status(201).json({
      state: 1,
      message: "created",
      created: created,
      updated: updated,
      errors: errors,
      upload: upload,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postSplit = async (req, res, next) => {
  try {
    const id = req.body.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const inventory = await Inventory.findById(id);

    if (!inventory) {
      const error = new Error("inventory not found");
      error.statusCode = 404;
      throw error;
    }

    if (inventory.qoh_case <= 0) {
      const error = new Error(
        "Can't split something you don't have any cases of."
      );
      error.statusCode = 409;
      throw error;
    }

    inventory.qoh_case = inventory.qoh_case - 1;
    inventory.qoh_units = inventory.qoh_units + inventory.case_quantity;

    await inventory.save();

    res.status(200).json({
      state: 1,
      message: "edited",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
