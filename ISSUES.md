Current Issues with Mouchak
---------------------------

- when plugins are used to manipulate existing images, event listeners might not work properly.
This is beacuse there is no wrapper element around it. Hence plugins that will listen to the parent
element of the image, will eventually end up listening to the page(that being directly the parent element
of the images).(So clicking/hovering on the page triggers events, rather than the images).

- need for wrapper elements of elements like images or tables ?

- find a better way to load/eval js and css files ?
