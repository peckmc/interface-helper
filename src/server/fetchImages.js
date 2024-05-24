const { google } = require('googleapis')
const { AxiosCustomInstance } = require('./AxiosCustomInstance.js');
const path = require('path');
const fs = require('fs');

const fetchImages = async (urls, oAuth2Client) => {
  const drive = google.drive({
    version: "v3",
    auth: oAuth2Client,
  });

  const sheets = google.sheets({
    version: 'v4',
    auth: oAuth2Client,
  });

  const axios = AxiosCustomInstance();
  const dir = path.join(__dirname, '../../files');

  //takes a list of urls and saves them locally
  for (const url of urls) {
    let filename = `/${url.slice(-13)}`;

    await axios.request({
      method: 'get',
      url: url,
      responseType: 'stream',
    })
    .then(function (response) {
      console.log('urlname:', url)
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
  await fs.readdir(dir, async function (err, files) {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    }
    for (const filename of files) {
      let requestBody = {
        name: filename,
        fields: 'id',
        parents: ['1a3jS1AW72ZmYz990cjtQoPp9SMl0OW2x'],
      };
      let media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(path.join(dir, filename))
      };
      //the jpg is uploaded
      let gfile = await drive.files.create({
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
          parents: ['1a3jS1AW72ZmYz990cjtQoPp9SMl0OW2x'],
        },
        fields: 'id',
      };
      //and then the jpg is converted to a google doc
      await drive.files.copy(params, (err, res) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('converted file id: ', res.data.id);
      });

      //the local file is deleted
      await fs.unlink(path.join(dir, filename), () => {
        console.log(`${filename} has been deleted.`);
      });
    };

    //TODO: create or append google sheet with ocr results from previously created docs
    var fileName = 'Historic Images OCR Results'
    var mimeType = 'application/vnd.google-apps.spreadsheet'

    await drive.files.list({
      q: `mimeType='${mimeType}' and name='${fileName}'`,
      fields: 'files(id, name)'
    }, (err, res) => {
        if (err) return console.log('drive files error: ' + err)
        const files = res.data.files
        if (files.length) {
          // There is an existing spreadsheet(s) with the same filename
          // The spreadsheet Id will be in files[x].id
          console.log(`found spreadsheet with id: ${files[0].id}`)
          let id = files[0].id;
        } else {
          // Create spreadsheet with filename ${fileName}
          sheets.spreadsheets.create({
            resource: {
              properties: { title: fileName }},
            fields: 'spreadsheetId'
          }, (err, spreadsheet) => {
            if (err) return console.log('spreadsheets create error: ' + err)
            // The spreadsheet Id will be in ${spreadsheet.data.spreadsheetId}
            console.log(`created spreadsheet with id: ${spreadsheet.data.spreadsheetId}`)
            id = spreadsheet.data.spreadsheetId;
          })
        }
    });
  });
};

module.exports = { fetchImages };