**1.** 



when i am uploading files from chatinbox its uploading as a class material, but i fetch it from class materials, i found section and semester nulll.. 

when i am uploading files as a teacher , it should be uploaded with section and semester also... 

&#x20;

&#x20;here is the response from class materials: 

&#x20; {

&#x20;           "id": "6e4587a5-065c-41d2-ae78-40716458dd30",

&#x20;           "title": "Antimicrobial Campaign outcome.pdf",

&#x20;           "description": "test",

&#x20;           "fileId": "e465f50f-075a-465a-bd88-0cc4765b6122",

&#x20;           "fileUrl": "https://testuappstorage.blob.core.windows.net/kingsley-vle-container/f038b445-93e8-4f2f-9e10-8d78e5cfe980.pdf",

&#x20;           "courseId": "d3c95a0c-693f-4e00-a7f0-0332399169d8",

&#x20;           "sectionId": null,

&#x20;           "semesterId": null,

&#x20;           "uploadedBy": "f6a44ed4-7cef-4f67-b8ce-2c6d1050e76b",

&#x20;           "createdAt": "2026-04-12T05:52:52.512Z",

&#x20;           "updatedAt": "2026-04-12T05:52:52.512Z",

&#x20;           "file": {

&#x20;               "id": "e465f50f-075a-465a-bd88-0cc4765b6122",

&#x20;               "name": "Antimicrobial Campaign outcome.pdf",

&#x20;               "slug": "f038b445-93e8-4f2f-9e10-8d78e5cfe980.pdf",

&#x20;               "fileUrl": "https://testuappstorage.blob.core.windows.net/kingsley-vle-container/f038b445-93e8-4f2f-9e10-8d78e5cfe980.pdf",

&#x20;               "fileType": "class\_material",

&#x20;               "uploadedBy": "f6a44ed4-7cef-4f67-b8ce-2c6d1050e76b",

&#x20;               "uploadedAt": "2026-04-12T05:52:52.135Z"

&#x20;           },

&#x20;           "course": {

&#x20;               "id": "d3c95a0c-693f-4e00-a7f0-0332399169d8",

&#x20;               "title": "ac circuit"

&#x20;           },

&#x20;           "section": null,

&#x20;           "semester": null,

&#x20;           "uploadedByUser": {

&#x20;               "id": "f6a44ed4-7cef-4f67-b8ce-2c6d1050e76b",

&#x20;               "email": "akhi78@gmail.com",

&#x20;               "role": "teacher"

&#x20;           }

&#x20;       },





**2.**



Request URL

http://localhost:5173/api/course-chat/d3c95a0c-693f-4e00-a7f0-0332399169d8/sections/null/messages

Request Method

POST

Status Code

500 Internal Server Error

payload: 

{"content":"<p>Hello, <br>how are you, Do you have completed your assignement ? <br><span data-type=\\"mention\\" class=\\"chat-mention\\" data-id=\\"602c1bfc-4200-45ea-8147-40b055039680\\" data-label=\\"Nusrat Jahan\\" data-mention-suggestion-char=\\"@\\">@Nusrat Jahan</span> <span data-type=\\"mention\\" class=\\"chat-mention\\" data-id=\\"b4dc05a1-127f-4cf6-aa89-a3d96f875b42\\" data-label=\\"Rahim Sheikh\\" data-mention-suggestion-char=\\"@\\">@Rahim Sheikh</span>  please report .<br><br>okay <br>not okay</p><p></p>"}. 





when i trying select the entered text and applying tools like list and heading formater . its applyed on the whole text





