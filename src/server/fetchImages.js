const { google } = require('googleapis')
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fetchImages = async (urls, oAuth2Client) => {
  var service = google.drive({
    version: "v3",
    auth: oAuth2Client,
  });

  const dir = path.join(__dirname, '../../files');

  //takes a list of urls and saves them locally
  for (const url of urls) {
    let filename = `/${url.name}.jpg`;

    await axios({
      method: 'get',
      url: url.url,
      responseType: 'stream'
    })
    .then(function (response) {
      console.log('urlname:', url.name)
      let stream = response.data.pipe(fs.createWriteStream(dir + filename));
      stream.on('finish', async () => {
        return;
      });
    })
    .catch((err) => {
      throw err;
    })
  }
  //after the files are saved, they are uploaded to google drive
  fs.readdir(dir, async function (err, files) {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    for (const filename of files) {
      let requestBody = {
        name: filename,
        fields: 'id',
        parents: ['1xFbfWyJFTwb1x5IMweGm4Y5Vbu0Id1mA'],
      };
      let media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(path.join(dir, filename))
      };
      //the jpg is uploaded
      let gfile = await service.files.create({
        requestBody,
        media: media,
      })
      let id = gfile.data.id;
      console.log('file id: ', gfile.data.id);
      const params = {
        fileId: id,
        resource:
        {
          mimeType: 'application/vnd.google-apps.document',
          parents: ['1xFbfWyJFTwb1x5IMweGm4Y5Vbu0Id1mA'],
        },
        fields: 'id',
      };
      //and then the jpg is converted to a google doc
      await service.files.copy(params, (err, res) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('converted file id: ', res.data.id);
      });
      //the local file is deleted
      await fs.unlink(path.join(dir, filename));
      console.log(`${filename} has been deleted.`)
    };
  });
}

module.exports = { fetchImages };