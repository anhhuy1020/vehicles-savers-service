const fs = require("fs");
const sharp = require('sharp');
const uuidv4 = require('uuid/v4');
const path = require('path');

module.exports = {
    saveAvatar
}
class Resize {
    constructor(folder) {
      this.folder = folder;
    }
    async save(buffer) {
      const filename = Resize.filename();
      const filepath = this.filepath(filename);

      console.log("save");
      await sharp(buffer)
        .resize(300, 300, { // size image 300x300
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .toFile(filepath);
        console.log("save 2");

      return filename;
    }
    static filename() {
       // random file name
      return `${uuidv4()}.png`;
    }
    filepath(filename) {
      return path.resolve(`${this.folder}/${filename}`)
    }
}

async function saveAvatar(image){
    const imagePath = path.join(__dirname, '../assets/images/avatars');
    const fileUpload = new Resize(imagePath);
    const filename = await fileUpload.save(Buffer.from(image,"base64"));
    return filename;
}