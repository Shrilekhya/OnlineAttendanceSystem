import face_recognition
import cv2
import sys
import os
import json

def read_img(path):
    img = cv2.imread(path)
    h , w , channels = img.shape
    width = 500
    ratio = width / float(w)
    height = int(h * ratio)
    return cv2.resize(img, (width, height))

known_encodings = []
known_names = []
present_names = []
known_dir = 'known'

for file in os.listdir(known_dir):
   if file.endswith('.jpg'):
    img = read_img( known_dir + '/' + file)
    img_enc = face_recognition.face_encodings(img)[0]
    known_encodings.append(img_enc)
    known_names.append(file.split('.')[0])

threshold = 0.47

input_file = sys.argv[1]
img = cv2.imread(input_file)
# img = cv2.imread('test.jpg')

face_locations = face_recognition.face_locations(img)
face_encodings = face_recognition.face_encodings(img, face_locations)


for i, face_encoding in enumerate(face_encodings):
    distances = face_recognition.face_distance(known_encodings, face_encoding)
    results = [distance < threshold for distance in distances]
    # print(results)
    # print(face_recognition.face_distance(known_encodings, face_encoding))

    for j in range(len(results)):
        if results[j]:
            name = known_names[j]
            present_names.append(name)
            (top, right, bottom, left) = face_locations[i]
            cv2.rectangle(img, (left, top), (right, bottom), (0, 0, 255), 2)
            cv2.putText(img, name, (left+2, bottom+20), cv2.FONT_HERSHEY_PLAIN, 1, (255, 255, 255), 1)
            # print(known_names[j])
       

known_names_json = json.dumps(present_names)
cv2.imshow('Image', img)
cv2.waitKey(0)
print(known_names_json)
