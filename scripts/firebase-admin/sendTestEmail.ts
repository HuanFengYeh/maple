import * as handlebars from "handlebars"
 import * as fs from "fs"
 import { Script } from "./types"
 import * as helpers from "../../functions/src/email/helpers"

 import { BillDigest, NotificationEmailDigest, UserDigest } from "functions/src/email/types"
 import { Record, String } from "runtypes"
 import { Timestamp } from "functions/src/firebase"
 import * as juice from "juice"
 import { User } from "firebase/auth"

 const path = require("path")

 const PARTIALS_DIR = "./functions/lib/email/partials/"
 const EMAIL_TEMPLATE_PATH = "./functions/lib/email/digestEmail.handlebars"

 const CSS_PATH = "../../public/email/emailStyle.css"
 const CSS_CONTENT = fs.readFileSync(path.join(__dirname, CSS_PATH), "utf8")

 // Define Handlebars helper functions
 handlebars.registerHelper("toLowerCase", helpers.toLowerCase)
 handlebars.registerHelper("noUpdatesFormat", helpers.noUpdatesFormat)
 handlebars.registerHelper("isDefined", helpers.isDefined)
 function registerPartials(directoryPath: string) {
   console.log("REGISTERING PARTIALS")

   const filenames = fs.readdirSync(directoryPath)

   filenames.forEach(filename => {
     const partialPath = path.join(directoryPath, filename)
     const stats = fs.statSync(partialPath)

     if (stats.isDirectory()) {
       // Recursive call for directories
       registerPartials(partialPath)
     } else if (stats.isFile() && path.extname(filename) === ".handlebars") {
       // Register partials for .handlebars files
       const partialName = path.basename(filename, ".handlebars")
       const partialContent = fs.readFileSync(partialPath, "utf8")
       handlebars.registerPartial(partialName, partialContent)
     }
   })
 }

 const renderToHtmlString = (digestData: NotificationEmailDigest) => {
   // TODO: Can we register these earlier since they're shared across all notifs - maybe at startup?
   registerPartials(PARTIALS_DIR)

   console.log("DEBUG: Working directory: ", process.cwd())
   console.log(
     "DEBUG: Digest template path: ",
     path.resolve(EMAIL_TEMPLATE_PATH)
   )

   const templateSource = fs.readFileSync(
     path.resolve(EMAIL_TEMPLATE_PATH),
     "utf8"
   )
   const compiledTemplate = handlebars.compile(templateSource)
   const htmlString = compiledTemplate({ digestData })
  console.log("css",CSS_CONTENT)
  // Inline CSS using Juice
  const inlinedHtml = juice.inlineContent(htmlString, CSS_CONTENT, {
    preserveMediaQueries: true,  
    removeStyleTags: true,       
  })

  return inlinedHtml
 }

 const Args = Record({ email: String })

 export const script: Script = async ({ db, args }) => {
   const { email } = Args.check(args)
   
   const digestData: NotificationEmailDigest = {
     notificationFrequency: "Monthly",
     startDate: new Date(),
     endDate: new Date(),
     bills: [],
     users: [],
     numBillsWithNewTestimony: 0,
     numUsersWithNewTestimony: 0
   }

   const htmlString = renderToHtmlString(digestData)

   // Create an email document in /notifications_mails to queue up the send
   await db.collection("emails").add({
     to: [email],
     replyTo: "noreply@yourdomain.com",
     message: {
       subject: "Test Notifications Digest",
       text: "test", // blank because we're sending HTML
       html: htmlString
     },
     createdAt: Timestamp.now()
   })
 }