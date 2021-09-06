const fs = require("fs").promises;
const dir = "./data/";

const read = async () => {
  try {
    const files = await fs.readdir(dir);

    const data = files.reduce(async (acc, filename) => {
      const file = await fs.readFile(dir + filename, "utf-8");

      acc[filename.replace(".json", "")] = JSON.parse(file);
      return acc;
    }, {});

    return data;
  } catch (error) {
    return {};
  }
};

exports.read = read;
