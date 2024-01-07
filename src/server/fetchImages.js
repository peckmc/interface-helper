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

  fs.readdir(dir, async function (err, files) {
    //handling error
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    //listing all files using forEach
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

      // Convert after processes here
      // Here we copy the IDs
      await service.files.copy(params, (err, res) =>
      {
        if (err) {
          console.error(err);
          return;
        }
        console.log('converted file id: ', res.data.id);
      });
    };
  });
}

module.exports = { fetchImages };